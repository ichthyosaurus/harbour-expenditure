/*
 * This file is part of harbour-expenditure.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * SPDX-FileCopyrightText: 2024 Mirian Margiani
 */

import QtQuick 2.6
import Sailfish.Silica 1.0

Label {
    width: parent.width - 2*x
    x: Theme.horizontalPageMargin
    wrapMode: Text.Wrap
    color: Theme.secondaryHighlightColor
    font.pixelSize: Theme.fontSizeExtraSmall
}
