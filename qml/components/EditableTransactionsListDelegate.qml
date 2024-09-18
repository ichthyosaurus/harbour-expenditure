import QtQuick 2.6
import Sailfish.Silica 1.0
import Opal.Delegates 1.0

import "../js/dates.js" as Dates

ListItem {
    id: item

    property ProjectData project

    contentHeight: Theme.itemSizeMedium
                   + Theme.itemSizeSmall
                   + Theme.itemSizeSmall
                   + 2*Theme.paddingMedium
    height: column.height
    width: root.width
    _backgroundColor: "transparent"
    highlighted: false

    property int _index: index
    property string _date: Dates.formatDate(local_time, Dates.fullDateTimeFormat, local_tz)
    property color _evenColor: Theme.rgba(Theme.highlightBackgroundColor, 0.5)

    property string _currency: currency
    property double _sum: sum
    property string _payer: payer
    property string _title: name

    property double _rate: rate
    property double _fixedFees: fixed_fees
    property double _percentageFees: percentage_fees

    Column {
        id: inner_column
        width: parent.width
        height: childrenRect.height

        TwoLineDelegate {
            text: item._date
            description: "%1: %2".arg(item._payer).arg(item._title)
            interactive: false
            showOddEven: true
            evenColor: item._evenColor

            rightItem: DelegateInfoItem {
                text: Number(sum).toLocaleString(Qt.locale('de_CH'))
                description: currency
                textLabel.font.pixelSize: Theme.fontSizeMedium
                descriptionLabel.font.pixelSize: Theme.fontSizeSmall
                alignment: Qt.AlignRight
            }
        }

        EditableRatesListDelegate {
            showOddEven: true
            evenColor: item._evenColor
            project: item.project
            currency: item._currency
            foreignSum: item._sum
            allowEmpty: true
            emptyValue: NaN
            value: item._rate
            placeholder: project.exchangeRates[currency] || ''

            EnterKey.iconSource: "image://theme/icon-m-enter-next"
            EnterKey.onClicked: {
                //                                if (_customFees) {
                //                                    percentageFeeField.forceActiveFocus()
                //                                } else {
                //                                    focus = false
                //                                }
            }
        }

        Item {
            width: parent.width
            height: Theme.itemSizeSmall + 2*Theme.paddingMedium

            Rectangle {
                anchors.fill: parent
                opacity: Theme.opacityFaint
                color: (item._index % 2 != 0) ? "transparent" : item._evenColor
                border.color: color
            }

            FeesItem {
                anchors.verticalCenter: parent.verticalCenter
            }
        }
    }
}