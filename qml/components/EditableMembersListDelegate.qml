/*
 * This file is part of harbour-expenditure.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * SPDX-FileCopyrightText: 2024 Mirian Margiani
 */

import QtQuick 2.6
import Sailfish.Silica 1.0
import Opal.Delegates 1.0

PaddedDelegate {
    id: root

    property alias text: _textField.text
    property TextField textField: _textField
    property alias acceptableInput: _textField.acceptableInput
    signal textFieldFocusChanged(var focus)

    property alias placeholderText: _textField.placeholderText

    signal enterKeyClicked
    property url enterKeyIcon: "image://theme/icon-m-enter"

    property bool actionEnabled: false
    property url actionIcon: "image://theme/icon-splus-error"
    signal actionTriggered

    minContentHeight: Theme.itemSizeSmall
    centeredContainer: contentContainer
    interactive: false
    padding.topBottom: 0

    Column {
        id: contentContainer
        width: parent.width

        TextField {
            id: _textField
            width: parent.width
            textMargin: 0
            textTopPadding: 0
            labelVisible: false
            EnterKey.onClicked: enterKeyClicked()
            EnterKey.iconSource: enterKeyIcon
            onActiveFocusChanged: textFieldFocusChanged(activeFocus)
        }
    }

    rightItem: IconButton {
        enabled: root.actionEnabled
        width: Theme.iconSizeSmallPlus
        icon.source: actionIcon
        onClicked: root.actionTriggered()
    }
}
