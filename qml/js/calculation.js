/*
 * This file is part of harbour-expenditure.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * SPDX-FileCopyrightText: 2024-2025 Mirian Margiani
 */

// note: this script is not a library
//
// TODO either convert this to WorkerScript or rewrite it in Python

.import "storage.js" as Storage

var _project = null
var _expenses = null
var _members = []
var _exchangeRates = {}
var _baseCurrency = ''
var _settlementPrecision = 2

var _payments = {}
var _benefits = {}
var _balances = {}
var _totalPayments = 0
var _settlement = []

var _peopleMap = {}
var _peopleArr = []


function calculate(projectData, directDebts) {
    console.log("calculating...")
    _reset(projectData)
    _collectSumsAndPeople()
    _splitDues(directDebts)

    if (_validate()) {
        _applyPrecision()
    } else {
        _settlement = null
        console.log("failed to calculate a valid settlement suggestion")
    }

    console.log("calculation results:")
    console.log("- project:", projectData.name)
    console.log("- paid:", JSON.stringify(_payments))
    console.log("- received:", JSON.stringify(_benefits))
    console.log("- members:", JSON.stringify(_peopleArr))
    console.log("- settlement:", JSON.stringify(_settlement))

    return {
        expenses: _expenses,
        baseCurrency: _baseCurrency,
        payments: _payments,
        benefits: _benefits,
        balances: _balances,
        totalPayments: _totalPayments,
        settlement: _settlement,
        people: _peopleArr,
    }
}

function defaultFor(arg, val) {
    return typeof arg !== 'undefined' ? arg : val
}

function _reset(projectData) {
    _project = projectData
    var metadata = Storage.getProjectMetadata(_project.rowid)
    _expenses = Storage.getProjectEntries(_project.rowid)
    _members = metadata.members
    _exchangeRates = _project.exchangeRates
    _baseCurrency = metadata.baseCurrency
    _settlementPrecision = metadata.precision

    _payments = {}
    _benefits = {}
    _balances = {}
    _totalPayments = 0
    _settlement = []
    _peopleMap = {}
    _peopleArr = []
}

function _collectSumsAndPeople() {
    for (var i in _expenses) {
        var x = _expenses[i]

        if (!_payments.hasOwnProperty(x.payer)) {
            _payments[x.payer] = 0
        }

        var convertedSum = _convertToBase(x)
        _totalPayments += convertedSum
        _payments[x.payer] += convertedSum
        var individualBenefit = convertedSum / x.beneficiaries_list.length

        for (var b in x.beneficiaries_list) {
            var bb = x.beneficiaries_list[b]

            if (!_benefits.hasOwnProperty(bb)) {
                _benefits[bb] = 0
            }

            _benefits[bb] += individualBenefit
            _peopleMap[bb] = true
        }

        _peopleMap[x.payer] = true
    }

    for (var m in _members) {
        // ensure all project members are mentioned even if they
        // have no payments/benefits
        //
        // Note: the members array is not used for collecting sums
        // because there may be names mentioned in expenses that
        // have been removed from the active members list.
        _peopleMap[_members[m]] = true
    }

    for (var p in _peopleMap) {
        if (!_peopleMap.hasOwnProperty(p)) continue
        _peopleArr.push(p)

        // set missing fields to zero
        var tmp = _benefits[p] || (_benefits[p] = 0)
        tmp = _payments[p] || (_payments[p] = 0)

        // collect balances: paid minus received
        _balances[p] = _payments[p] - _benefits[p]
    }
}

function _convertToBase(expense) {
    var effectiveRate = 1.00

    if (!!expense.rate) {
        effectiveRate = expense.rate
    } else if (_exchangeRates.hasOwnProperty(expense.currency)) {
        effectiveRate = _exchangeRates[expense.currency] || NaN
    } else {
        effectiveRate = NaN
    }

    var price = expense.sum * effectiveRate

    if (!!expense.percentage_fees) {
        price += price / 100 * expense.percentage_fees
    }

    if (!!expense.fixed_fees) {
        price += expense.fixed_fees
    }

    return price
}

function _sortMap(map, ascending) {
    var kv = []
    ascending = defaultFor(ascending, true)

    for(var key in map) {
        if (!map.hasOwnProperty(key)) continue
        kv.push({'key': key, 'value': map[key]})
    }

    function sortKeyValue(a, b) {
        return ascending ? a.value - b.value : b.value - a.value;
    }

    var sorted = kv.sort(sortKeyValue)
    return sorted
}

function _splitDues(directDebts) {
    if (!!directDebts) {
        _settlement = _splitDuesDirectly()
    } else {
        _settlement = _splitDuesOptimized()
    }
}

function _splitDuesDirectly() {
    var settlement = []
    var debts = {}  // debts[from][to] = value

    for (var i in _expenses) {
        var x = _expenses[i]
        var convertedSum = _convertToBase(x)
        var individualDebt = convertedSum / x.beneficiaries_list.length

        for (var b in x.beneficiaries_list) {
            var bb = x.beneficiaries_list[b]

            if (bb === x.payer) {
                continue
            }

            if (!debts.hasOwnProperty(bb)) {
                debts[bb] = {}
            }

            if (!debts[bb].hasOwnProperty(x.payer)) {
                debts[bb][x.payer] = 0.00
            }

            debts[bb][x.payer] += individualDebt
        }
    }

    for (var from in debts) {
        for (var to in debts[from]) {
            var value = Number(debts[from][to])

            if (debts.hasOwnProperty(to) && debts[to].hasOwnProperty(from)) {
                var reverseValue = Number(debts[to][from])

                if (value == reverseValue) {
                    debts[from][to] = 0.00
                    debts[to][from] = 0.00
                    value = 0.00
                } else if (value > reverseValue) {
                    debts[from][to] = value - reverseValue
                    debts[to][from] = 0.00
                    value = debts[from][to]
                } else if (reverseValue > value) {
                    continue
                }
            }

            if (value != Number(0.00)) {
                settlement.push({
                    from: from,
                    to: to,
                    value: value
                })
            }
        }
    }

    return settlement
}

function _splitDuesOptimized() {
    // apply a (n-1) algorithm  to settle expenses (how much each person ows to whom)

    var meanValue = 0
    var sortedNames = []
    var sortedValues = []
    var settlement = []

    function prepareArrays() {
        var pendingBalances = {}
        var totalPending = 0

        for (var person in _peopleMap) {
            pendingBalances[person] = (_payments[person] || 0.00) - (_benefits[person] || 0.00)
            totalPending += pendingBalances[person]
        }

        var sortedBalances = _sortMap(pendingBalances, true)

        for (var i in sortedBalances) {
            sortedNames.push(sortedBalances[i].key)
            sortedValues.push(sortedBalances[i].value)
        }
    }

    function calculateSettlement() {
        var sortedValuesPaid = []

        for (var i in sortedValues) {
            sortedValuesPaid.push(sortedValues[i] - meanValue)
        }

        var x = 0
        var y = sortedValues.length - 1
        var debt

        while (x < y) {
            debt = Math.min(-(sortedValuesPaid[x]), sortedValuesPaid[y])
            sortedValuesPaid[x] += debt
            sortedValuesPaid[y] -= debt

            settlement.push({
                from: sortedNames[x],
                to: sortedNames[y],
                value: Number(debt)
            })

            if (sortedValuesPaid[x] === 0) { x++ }
            if (sortedValuesPaid[y] === 0) { y-- }
        }
    }

    prepareArrays()
    calculateSettlement()

    return settlement
}

function _validate() {
    var checkBalances = {}
    var success = true

    for (var i in _settlement) {
        var set = _settlement[i]

        if (!checkBalances.hasOwnProperty(set.from))
            checkBalances[set.from] = 0
        if (!checkBalances.hasOwnProperty(set.to))
            checkBalances[set.to] = 0

        checkBalances[set.from] -= set.value
        checkBalances[set.to] += set.value
    }

    for (var j in _balances) {
        if (!_balances.hasOwnProperty(j)) continue

        if (Number(_balances[j]).toFixed(12) ===
                Number(checkBalances[j]).toFixed(12)) {
            console.log("settlement ok for", j, "at", _balances[j])
        } else {
            if (_balances[j] === 0.00 && !checkBalances.hasOwnProperty(j)) {
                // this person has an even balance and does not appear
                // in the settlement - that's ok
                continue
            } else {
                console.error("!!! settlement failed for", j, "- expected",
                              _balances[j], "but got", checkBalances[j])
                success = false
            }
        }
    }

    return success
}

function _applyPrecision() {
    var filtered = []
    var zero = Number(0.00).toFixed(_settlementPrecision)

    for (var i in _settlement) {
        var set = _settlement[i]
        var fixed = Number(set.value).toFixed(_settlementPrecision)

        if (fixed == zero || -fixed == zero) {
            continue
        } else {
            filtered.push({
                from: set.from,
                to: set.to,
                value: Number(fixed),
            })
        }
    }

    _settlement = filtered
}
