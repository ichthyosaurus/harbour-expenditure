/*
 * This file is part of harbour-expenditure.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * SPDX-FileCopyrightText: 2024-2026 Mirian Margiani
 */

.pragma library

var dbDateFormat = "yyyy-MM-dd hh:mm:ss"

var timeFormat = qsTr("hh':'mm",
    "time only format, as in “10:00 o'clock”, see https://doc.qt.io/archives/qt-5.15/qml-qtqml-date.html#format-strings")
var dateTimeFormat = qsTr("d MMM yyyy, hh':'mm",
    "date and time format, as in “Dec. 1st 2023, 10:00 o'clock”, see https://doc.qt.io/archives/qt-5.15/qml-qtqml-date.html#format-strings")
var fullDateTimeFormat = qsTr("ddd d MMM yyyy, hh':'mm",
    "full date and time format, as in “Fri., Dec. 1st 2023, 10:00 o'clock”, see https://doc.qt.io/archives/qt-5.15/qml-qtqml-date.html#format-strings")
var fullDateFormat = qsTr("ddd d MMM yyyy",
    "full date format, as in “Fri., Dec. 1st 2023”, see https://doc.qt.io/archives/qt-5.15/qml-qtqml-date.html#format-strings")
var dateFormat = qsTr("d MMM yyyy",
    "date format, as in “Dec. 1st 2023”, see https://doc.qt.io/archives/qt-5.15/qml-qtqml-date.html#format-strings")
var dateNoYearFormat = qsTr("d MMM",
    "date format without year, as in “Dec. 1st”, see https://doc.qt.io/archives/qt-5.15/qml-qtqml-date.html#format-strings")


function getTimezone() {
    return new Date().toLocaleString(Qt.locale("C"), "t")
}

function parseDate(dbDateString) {
    // This function creates a Date object from a date string
    // that strictly follows dbDateFormat.
    //
    // Use this function to make sure JS does not calculate
    // some time zone magic when converting. The resulting Date
    // object is interpreted as "local time" and contains exactly
    // the same numbers as were given in dbDateString.

    if (typeof dbDateString === 'undefined' || dbDateString === "") {
        return ""
    }

    var dateTime = dbDateString.split(' ')
    var date = dateTime[0].split('-')
    var time = ["0", "0", "0"] // set to zero if the string had no time part

    if (dateTime.length >= 2) {
        time = dateTime[1].split(':')
    }

    return new Date(
        parseInt(date[0]), parseInt(date[1])-1, parseInt(date[2]),
        parseInt(time[0]), parseInt(time[1]), parseInt(time[2])
    )
}

function formatDate(dbDateString, format, zone, alternativeIfEmpty) {
    var date = null

    if (dbDateString instanceof Date) {
        if (isNaN(dbDateString)) {
            return alternativeIfEmpty
        }

        date = dbDateString
    } else {
        if (dbDateString === "" && alternativeIfEmpty !== "" && !!alternativeIfEmpty) {
            return alternativeIfEmpty
        }

        date = parseDate(dbDateString)
    }

    date = date.toLocaleString(Qt.locale(), format)

    if (zone !== undefined && zone !== "" && zone !== getTimezone()) {
        return qsTr("%1 (%2)", "1: date, 2: time zone info").arg(date).arg(zone)
    }

    return date
}
