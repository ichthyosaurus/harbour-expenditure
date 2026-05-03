/*
 * This file is part of harbour-expenditure.
 * SPDX-License-Identifier: GPL-3.0-or-later
 * SPDX-FileCopyrightText: 2025-2026 Mirian Margiani
 */

#ifndef QUIET_LOGGING_H
#define QUIET_LOGGING_H

#include <QtGlobal>
#include <QString>
#include <QHash>

#include <stdio.h>
#include <stdlib.h>

namespace {
    const static QHash<QString, bool> annoyances {
        {QStringLiteral("engine::invalidate()"), true},
        {QStringLiteral("QQuickLayoutAttached::invalidateItem"), true},
        {QStringLiteral("QQuickLayout::invalidate(), polish()"), true},
        {QStringLiteral("ItemChildAddedChange"), true},
        {QStringLiteral("ItemChildRemovedChange"), true},
    };

    void logWithoutSpam(QtMsgType type, const QMessageLogContext& context,
                        const QString& msg) {
        if (type == QtMsgType::QtDebugMsg && (
                annoyances.contains(msg) ||
                msg.startsWith("QQuickGridLayout") ||
                msg.startsWith("\"\" QQuickGridLayout")
            )) {
            return;
        }

        QString message = qFormatLogMessage(type, context, msg);
        fprintf(stderr, "%s\n", qPrintable(message));
    }
}

inline void setupLogging() {
    qInstallMessageHandler(logWithoutSpam);
}

#endif  // QUIET_LOGGING_H
