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
    UIOrigins,
    UIElementBuilders,
    UILayoutBuilders,
    Themes,
} = lcjs

const TIME_DOMAIN = 10 * 1000
const SAMPLE_RATE = 1000 // points per s

fetch(new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'examples/assets/0508/medical-data.json')
    .then((r) => r.json())
    .then((data) => {
        const { ecg, bloodPressure, bloodVolume, bloodOxygenation } = data

        const channels = [
            {
                shortName: 'ECG/EKG',
                name: 'Electrocardiogram',
                dataSet: ecg,
            },
            {
                shortName: 'NIBP',
                name: 'Blood pressure',
                dataSet: bloodPressure,
            },
            {
                shortName: 'BFV',
                name: 'Blood flow volume',
                dataSet: bloodVolume,
            },
            {
                shortName: 'Sp02',
                name: 'Blood oxygen saturation',
                dataSet: bloodOxygenation,
            },
        ]
        const lc = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
        const chart = lc
            .ChartXY({
                theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
            })
            .setTitle('Medical Dashboard')
            .setMouseInteractions(false)
            .setAutoCursorMode(AutoCursorModes.disabled)
            .setPadding({ right: 140 })
        chart.getDefaultAxisY().dispose()
        const axisECG = chart.addAxisY({ iStack: 3 }).setLength({ relative: 0.4 })
        const axisNIBP = chart.addAxisY({ iStack: 2 }).setLength({ relative: 0.3 })
        const axisBFV = chart.addAxisY({ iStack: 1 }).setLength({ relative: 0.2 })
        const axisSp = chart.addAxisY({ iStack: 0 }).setLength({ relative: 0.2 })
        const yAxisList = [axisECG, axisNIBP, axisBFV, axisSp]
        const theme = chart.getTheme()
        const axisX = chart
            .getDefaultAxisX()
            .setTickStrategy(AxisTickStrategies.Time)
            .setDefaultInterval((state) => ({
                end: state.dataMax,
                start: (state.dataMax ?? 0) - TIME_DOMAIN,
                stopAxisAfter: false,
            }))
            .setScrollStrategy(AxisScrollStrategies.progressive)

        const channelsComponents = channels.map((channel, i) => {
            const axisY = yAxisList[i]
                .setMouseInteractions(false)
                .setTickStrategy(AxisTickStrategies.Empty)
                .setStrokeStyle(emptyLine)
                .setAnimationScroll(false)
            const series = chart
                .addPointLineAreaSeries({
                    dataPattern: 'ProgressiveX',
                    automaticColorIndex: Math.max(i - 1, 0),
                    yAxis: axisY,
                })
                .setAreaFillStyle(emptyFill)
                .setName(channel.name)
                .setMaxSampleCount(50_000)
            if (channel.name === 'Electrocardiogram') {
                series.setStrokeStyle((stroke) =>
                    stroke.setFillStyle(
                        new SolidFill({
                            color: theme.examples.badGoodColorPalette[theme.examples.badGoodColorPalette.length - 1],
                        }),
                    ),
                )
            }
            return { axisY, series }
        })

        const uiList = channelsComponents.map((components, i) => {
            const axisY = components.axisY
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
                            { x: axisX, y: axisY },
                            chart.coordsRelative,
                        ),
                    )
                    .setOrigin(UIOrigins.LeftTop)
                    .setMargin({ left: 10 })
            }
            chart.onResize(positionUI)
            requestAnimationFrame(positionUI)

            return {
                labelSampleRate,
                labelBpmValue,
            }
        })

        let tSamplePos = window.performance.now()
        let iSampleX = 0
        const addData = () => {
            const tNow = window.performance.now()
            const seriesNewPoints = channelsComponents.map((_) => [])
            while (tNow > tSamplePos) {
                const x = tSamplePos
                for (let i = 0; i < channelsComponents.length; i += 1) {
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
            channelsComponents.forEach((comp, i) => comp.series.add(seriesNewPoints[i]))
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
