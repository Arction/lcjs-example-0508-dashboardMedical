/**
 * LightningChart JS example showcasing a medical Dashboard.
 */

const lcjs = require('@arction/lcjs')
const {
    AxisScrollStrategies,
    AxisTickStrategies,
    AutoCursorModes,
    emptyFill,
    SolidFill,
    emptyLine,
    lightningChart,
    synchronizeAxisIntervals,
    UIOrigins,
    UIElementBuilders,
    UILayoutBuilders,
    Themes,
} = lcjs

const TIME_DOMAIN = 10 * 1000
const SAMPLE_RATE = 1000 // points per s

fetch(document.head.baseURI + 'examples/assets/0508/medical-data.json')
    .then((r) => r.json())
    .then((data) => {
        const { ecg, bloodPressure, bloodVolume, bloodOxygenation } = data

        const channels = [
            {
                shortName: 'ECG/EKG',
                name: 'Electrocardiogram',
                dataSet: ecg,
                yStart: -1955,
                yEnd: 1195,
            },
            {
                shortName: 'NIBP',
                name: 'Blood pressure',
                dataSet: bloodPressure,
                yStart: 0.475,
                yEnd: 0.795,
            },
            {
                shortName: 'BFV',
                name: 'Blood flow volume',
                dataSet: bloodVolume,
                yStart: 0.155,
                yEnd: 0.445,
            },
            {
                shortName: 'Sp02',
                name: 'Blood oxygen saturation',
                dataSet: bloodOxygenation,
                yStart: 0.015,
                yEnd: 0.155,
            },
        ]
        // NOTE: Using `Dashboard` is no longer recommended for new applications. Find latest recommendations here: https://lightningchart.com/js-charts/docs/basic-topics/grouping-charts/
        const dashboard = lightningChart()
            .Dashboard({
                numberOfRows: channels.length,
                numberOfColumns: 1,
                // theme: Themes.darkGold
            })
            .setRowHeight(0, 0.4)
            .setRowHeight(1, 0.3)
            .setRowHeight(2, 0.2)
            .setRowHeight(3, 0.2)

        const theme = dashboard.getTheme()

        const chartList = channels.map((channel, i) => {
            const chart = dashboard
                .createChartXY({ rowIndex: i, columnIndex: 0 })
                .setPadding({ bottom: 4, top: 4, right: 200, left: 10 })
                .setMouseInteractions(false)
                .setAutoCursorMode(AutoCursorModes.disabled)
            const axisX = chart.getDefaultAxisX().setMouseInteractions(false)
            const axisY = chart
                .getDefaultAxisY()
                .setMouseInteractions(false)
                .setInterval({ start: channel.yStart, end: channel.yEnd })
                .setTickStrategy(AxisTickStrategies.Empty)
                .setStrokeStyle(emptyLine)
            if (i > 0) {
                chart.setTitleFillStyle(emptyFill)
            } else {
                chart.setTitle('Medical Dashboard')
            }
            if (i < channels.length - 1) {
                axisX
                    .setTickStrategy(AxisTickStrategies.Time, (ticks) =>
                        ticks
                            .setMajorTickStyle((majorTicks) =>
                                majorTicks.setLabelFillStyle(emptyFill).setTickStyle(emptyLine).setTickLength(0).setTickPadding(0),
                            )
                            .setMinorTickStyle((minorTicks) =>
                                minorTicks.setLabelFillStyle(emptyFill).setTickStyle(emptyLine).setTickLength(0).setTickPadding(0),
                            ),
                    )
                    .setStrokeStyle(emptyLine)
                    .setScrollStrategy(undefined)
            } else {
                axisX
                    .setTickStrategy(AxisTickStrategies.Time)
                    .setInterval({ start: -TIME_DOMAIN, end: 0, stopAxisAfter: false })
                    .setScrollStrategy(AxisScrollStrategies.progressive)
            }
            return chart
        })

        const uiList = chartList.map((chart, i) => {
            const axisX = chart.getDefaultAxisX()
            const axisY = chart.getDefaultAxisY()
            const channel = channels[i]
            const ui = chart
                .addUIElement(UILayoutBuilders.Column, chart.coordsRelative)
                .setBackground((background) => background.setFillStyle(emptyFill).setStrokeStyle(emptyLine))
                .setMouseInteractions(false)
                .setVisible(false)

            ui.addElement(UIElementBuilders.TextBox).setText(channel.shortName)
            ui.addElement(UIElementBuilders.TextBox)
                .setText(channel.name)
                .setTextFont((font) => font.setSize(10))
            const labelSampleRate = ui
                .addElement(UIElementBuilders.TextBox)
                .setText('')
                .setTextFont((font) => font.setSize(10))

            let labelBpmValue
            if (channel.name === 'Electrocardiogram') {
                const labelBpm = ui.addElement(UIElementBuilders.TextBox).setMargin({ top: 10 }).setText('BPM')
                labelBpmValue = ui
                    .addElement(UIElementBuilders.TextBox)
                    .setText('')
                    .setTextFont((font) => font.setSize(36))
            }

            const positionUI = () => {
                ui.setVisible(true)
                    .setPosition(
                        chart.translateCoordinate(
                            { x: axisX.getInterval().end, y: axisY.getInterval().end },
                            chart.coordsAxis,
                            chart.coordsRelative,
                        ),
                    )
                    .setOrigin(UIOrigins.LeftTop)
                    .setMargin({ left: 10 })
            }
            chart.onResize(positionUI)

            return {
                labelSampleRate,
                labelBpmValue,
            }
        })

        synchronizeAxisIntervals(...chartList.map((chart) => chart.getDefaultAxisX()))

        const seriesList = chartList.map((chart, i) => {
            const channel = channels[i]
            const series = chart
                .addLineSeries({
                    dataPattern: {
                        pattern: 'ProgressiveX',
                    },
                    automaticColorIndex: Math.max(i - 1, 0),
                })
                .setName(channel.name)
                .setDataCleaning({ minDataPointCount: 1000 })

            if (channel.name === 'Electrocardiogram') {
                series.setStrokeStyle((stroke) =>
                    stroke.setFillStyle(
                        new SolidFill({
                            color: theme.examples.badGoodColorPalette[theme.examples.badGoodColorPalette.length - 1],
                        }),
                    ),
                )
            }
            return series
        })

        let tSamplePos = window.performance.now()
        let iSampleX = 0
        const addData = () => {
            const tNow = window.performance.now()
            const seriesNewPoints = seriesList.map((_) => [])
            while (tNow > tSamplePos) {
                const x = tSamplePos
                for (let i = 0; i < seriesList.length; i += 1) {
                    const channel = channels[i]
                    const dataSet = channel.dataSet
                    const sample = dataSet[iSampleX % dataSet.length]
                    seriesNewPoints[i].push({ x, y: sample })

                    if (channel.name === 'Electrocardiogram') {
                        updateBpm(sample)
                    }
                }
                tSamplePos += 1000 / SAMPLE_RATE
                iSampleX += 1
            }
            seriesList.forEach((series, i) => series.add(seriesNewPoints[i]))
            channelIncomingDataPointsCount += seriesNewPoints[0].length
            requestAnimationFrame(addData)
        }
        requestAnimationFrame(addData)

        let channelIncomingDataPointsCount = 0
        let channelIncomingDataPointsLastUpdate = window.performance.now()
        setInterval(() => {
            const tNow = window.performance.now()
            const chDataPointsPerSecond = Math.round((channelIncomingDataPointsCount * 1000) / (tNow - channelIncomingDataPointsLastUpdate))
            const bpm = (beatsCount * 60 * 1000) / (tNow - tStart)

            uiList.forEach((ui, i) => {
                ui.labelSampleRate.setText(`${chDataPointsPerSecond} samples / second`)
                if (ui.labelBpmValue) {
                    ui.labelBpmValue.setText(`${Math.round(bpm)}`)
                }
            })
            channelIncomingDataPointsCount = 0
            channelIncomingDataPointsLastUpdate = tNow
        }, 2000)

        const naiveBeatThreshold = 800
        let tStart = window.performance.now()
        let beatsCount = 0
        const updateBpm = (() => {
            let lastY = 0
            return (newSample) => {
                if (lastY < naiveBeatThreshold && newSample > naiveBeatThreshold) {
                    // Beat.
                    beatsCount += 1
                }
                lastY = newSample
            }
        })()
    })
