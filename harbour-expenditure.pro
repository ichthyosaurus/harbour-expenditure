# This file is part of Expenditure.
# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: 2022 Tobias Planitzer
# SPDX-FileCopyrightText: 2023-2024 Mirian Margiani

# Application name defined in TARGET has a corresponding QML filename.
# If name defined in TARGET is changed, the following needs to be done
# to match new name:
#   - corresponding QML filename must be changed
#   - desktop icon filename must be changed
#   - desktop filename must be changed
#   - icon definition filename in desktop file must be changed
#   - translation filenames have to be changed
TARGET = harbour-expenditure

CONFIG += sailfishapp

# Note: version number is configured in yaml
DEFINES += APP_VERSION=\\\"$$VERSION\\\"
DEFINES += APP_RELEASE=\\\"$$RELEASE\\\"
include(libs/opal-cached-defines.pri)

include(libs/opal.pri)

SOURCES += \
    src/harbour-expenditure.cpp \

DISTFILES += \
    qml/*.qml \
    qml/*/*.qml \
    qml/*/*.js \
    qml/*/*.py \
    rpm/harbour-*.changes \
    rpm/harbour-*.spec \
    rpm/harbour-*.yaml \
    translations/*.ts \
    harbour-*.desktop

SAILFISHAPP_ICONS = 86x86 108x108 128x128 172x172

# to disable building translations every time, comment out the
# following CONFIG line
CONFIG += sailfishapp_i18n
TRANSLATIONS += translations/harbour-expenditure-*.ts
