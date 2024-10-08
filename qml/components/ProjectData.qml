/*
 * This file is part of harbour-expenditure.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * SPDX-FileCopyrightText: 2024 Mirian Margiani
 */

import QtQuick 2.6
import Sailfish.Silica 1.0

import "../enums"
import "../js/storage.js" as Storage

QtObject {
    id: root

    // STATE
    readonly property bool active: rowid >= 0
    signal loaded(var rowid)

    // CONFIGURATION
    property bool loadExpenses: true
    property bool loadRates: true
    property int sortOrder: SortOrder.decreasing
    property var renamedMembers: ({})
    property var importedExpenses: ([])

    // PROJECT METADATA AND DATA
    // ident -1 is reserved for unsaved new projects
    //     < -1 clears all loaded data
    property int rowid
    property string name
    property string baseCurrency
    property var members: ([])
    property string lastCurrency
    property string lastPayer
    property var lastBeneficiaries: ([])
    property int ratesMode: RatesMode.fixed
    property int feesMode: FeesMode.hiddenByDefault
    property int precision: 2

    property var currencies: ([])
    property var exchangeRates: ({})
    readonly property ListModel expenses: ListModel {}

    // IMMEDIATELY APPLIED FUNCTIONS
    function removeEntry(item, rowid, index) {
        item.remorseDelete(function() {
            Storage.deleteExpense(root.rowid, rowid)
            root.expenses.remove(index)
            reloadRates()
        })
    }

    function addEntry(utc_time, local_time, local_tz,
                      name, info, sum, currency,
                      rate, percentageFees, fixedFees,
                      payer, beneficiaries,
                      reload) {
        var newEntry = Storage.addExpense(
            root.rowid,
            utc_time, local_time, local_tz,
            name, info, sum, currency,
            rate, percentageFees, fixedFees,
            payer, beneficiaries)
        reloadLastInfo()
        reloadRates()

        if (reload) {
            reloadContents()
        } else if (Storage.getSortOrder(sortOrder) === 'DESC') {
            expenses.insert(0, newEntry)
        } else {
            expenses.append(newEntry)
        }
    }

    function updateEntry(index, rowid,
                         utc_time, local_time, local_tz,
                         name, info, sum, currency,
                         rate, percentageFees, fixedFees,
                         payer, beneficiaries,
                         reload) {
        var changedEntry = Storage.updateExpense(
            root.rowid, rowid,
            utc_time, local_time, local_tz,
            name, info, sum, currency,
            rate, percentageFees, fixedFees,
            payer, beneficiaries)
        reloadLastInfo()
        reloadRates()

        if (reload) {
            reloadContents()
        } else {
            expenses.set(index, changedEntry)
        }
    }

    function reloadLastInfo() {
        var metadata = Storage.getProjectMetadata(rowid)
        lastCurrency = metadata.lastCurrency || metadata.baseCurrency
        lastPayer = metadata.lastPayer || ''
        lastBeneficiaries = metadata.lastBeneficiaries
    }

    function reloadMetadata() {
        var metadata = Storage.getProjectMetadata(rowid)
        if (metadata === null) return

        name = metadata.name
        baseCurrency = metadata.baseCurrency
        members = metadata.members.length > 0 ? metadata.members : [qsTr("User")]
        lastCurrency = metadata.lastCurrency || metadata.baseCurrency
        lastPayer = metadata.lastPayer || ''
        lastBeneficiaries = metadata.lastBeneficiaries
        ratesMode = metadata.ratesMode
        feesMode = metadata.feesMode
        precision = metadata.precision
    }

    function reloadContents() {
        expenses.clear()

        if (loadExpenses) {
            // The list must be cleared right before adding new entries
            // to avoid a race condition during initialization. If reloadContents()
            // is called twice it could lead to entries being duplicated...
            var data = Storage.getProjectEntries(rowid, sortOrder)
            expenses.clear()
            expenses.append(data)
        }
    }

    function reloadRates() {
        if (!loadRates) return

        var rates = Storage.getProjectExchangeRates(rowid)
        exchangeRates = rates.rates
        currencies = rates.currencies
    }

    // FUNCTIONS APPLIED ONCE Storage.saveProjects(...) IS CALLED
    function removeMember(name) {
        members = members.filter(function(item) {
            return item !== name
        })

        if (renamedMembers.hasOwnProperty(name)) {
            delete renamedMembers[name]
        }
    }

    function addMember(name) {
        members = members.concat([name])
    }

    function renameMember(name, newName) {
        // note: the members array is not updated in this case
        // to avoid a binding loop when editing members
        renamedMembers[name] = newName
    }

    // PRIVATE FUNCTIONS
    function _initialize() {
        if (rowid == -1) {
            // new project, nothing to do
        } else if (rowid < -1) {
            // reset all current data
            name = ''
            baseCurrency = ''
            members = [qsTr("User")]
            lastCurrency = ''
            lastBeneficiaries = []
            lastPayer = ''
            ratesMode = RatesMode.fixed
            feesMode = FeesMode.hiddenByDefault
            precision = 2
            exchangeRates = {}
            currencies = []
            expenses.clear()

            renamedMembers = {}
            importedExpenses = []
        } else {
            // actually load a project
            renamedMembers = {}
            importedExpenses = []
            reloadMetadata()
            reloadRates()
            reloadContents()
            console.log("loaded project data:", rowid, name, members)
        }

        loaded(rowid)
    }

    onSortOrderChanged: {
        reloadContents()
    }

    onRowidChanged: {
        _initialize()
    }
}
