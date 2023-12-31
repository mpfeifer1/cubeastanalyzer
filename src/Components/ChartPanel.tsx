import React from "react";
import { ChartPanelProps, ChartPanelState, ChartType, CrossColor, Solve, StepName } from "../Helpers/Types";
import { Chart as ChartJS, ChartData, CategoryScale } from 'chart.js/auto';
import { calculateAverage, calculateMovingAverage, calculateMovingPercentage, calculateMovingStdDev, reduceDataset, splitIntoChunks } from "../Helpers/MathHelpers";
import { createOptions, buildChartHtml } from "../Helpers/ChartHelpers";
import { Card, Row, Col, Ratio } from "react-bootstrap";
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Const } from "../Helpers/Constants";

export class ChartPanel extends React.Component<ChartPanelProps, ChartPanelState> {
    state: ChartPanelState = { solves: [] };

    getEmptyChartData() {
        let data: ChartData<"line"> = {
            labels: [],
            datasets: []
        }
        return data;
    }

    buildRunningAverageData() {
        let movingAverage = calculateMovingAverage(this.props.solves.map(x => x.time), this.props.windowSize);

        let labels = [];
        for (let i = 1; i <= movingAverage.length; i++) {
            labels.push(i.toString())
        };

        movingAverage = reduceDataset(movingAverage, this.props.pointsPerGraph);
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Average Time Of ${this.props.windowSize}`,
                data: movingAverage
            }]
        }

        return data;
    }

    buildRunningStdDevData() {
        let movingAverage = calculateMovingStdDev(this.props.solves.map(x => x.time), this.props.windowSize);

        let labels = [];
        for (let i = 1; i <= movingAverage.length; i++) {
            labels.push(i.toString())
        };

        movingAverage = reduceDataset(movingAverage, this.props.pointsPerGraph);
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Average StdDev Of ${this.props.windowSize}`,
                data: movingAverage
            }]
        }

        return data;
    }

    buildRunningTpsData() {
        let movingAverage = calculateMovingAverage(this.props.solves.map(x => x.tps), this.props.windowSize);

        let labels = [];
        for (let i = 1; i <= movingAverage.length; i++) {
            labels.push(i.toString())
        };

        movingAverage = reduceDataset(movingAverage, this.props.pointsPerGraph);
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Average TPS Of ${this.props.windowSize}`,
                data: movingAverage
            }]
        }

        return data;
    }

    buildRunningTurnsData() {
        let movingAverage = calculateMovingAverage(this.props.solves.map(x => x.turns), this.props.windowSize);

        let labels = [];
        for (let i = 1; i <= movingAverage.length; i++) {
            labels.push(i.toString())
        };

        movingAverage = reduceDataset(movingAverage, this.props.pointsPerGraph);
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Average Turns Of ${this.props.windowSize}`,
                data: movingAverage
            }]
        }

        return data;
    }

    buildRunningRecognitionExecution() {
        let movingRecognition = calculateMovingAverage(this.props.solves.map(x => x.recognitionTime), this.props.windowSize);
        let movingExecution = calculateMovingAverage(this.props.solves.map(x => x.executionTime), this.props.windowSize);

        let labels = [];
        for (let i = 1; i <= movingRecognition.length; i++) {
            labels.push(i.toString())
        };

        movingExecution = reduceDataset(movingExecution, this.props.pointsPerGraph);
        movingRecognition = reduceDataset(movingRecognition, this.props.pointsPerGraph);
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Average Recognition Of ${this.props.windowSize}`,
                data: movingRecognition
            },
            {
                label: `Average Execution Of ${this.props.windowSize}`,
                data: movingExecution
            }]
        }

        return data;
    }

    buildStepPercentages() {
        let totals: { [step in StepName]?: number } = {};
        for (let i = 0; i < this.props.steps.length; i++) {
            totals[this.props.steps[i]] = 0;
        }

        let recentSolves = this.props.solves.slice(-this.props.windowSize);
        for (let i = 0; i < recentSolves.length; i++) {
            for (let j = 0; j < this.props.steps.length; j++) {
                totals[recentSolves[i].steps[j].name]! += recentSolves[i].steps[j].time;
            }
        }

        let labels: string[] = [];
        let values: number[] = [];

        for (let key in totals) {
            labels.push(key);
            values.push(totals[key as StepName]! / recentSolves.length);
        }

        // TODO: make the colors consistent
        let data: ChartData<"doughnut"> = {
            labels: labels,
            datasets: [{
                label: `Seconds each step takes (of recent ${this.props.windowSize})`,
                data: values
            }]
        }

        return data;
    }

    buildStepAverages() {
        if (this.props.solves.length == 0) {
            return this.getEmptyChartData();
        }

        let datasets = [];

        for (let i = 0; i < this.props.steps.length; i++) {
            let average: number[] = calculateMovingAverage(this.props.solves.map(x => x.steps[i].time), this.props.windowSize);
            average = reduceDataset(average, this.props.pointsPerGraph);

            let dataset = {
                label: `${this.props.solves[0].steps[i].name} Average of ${this.props.windowSize}`,
                data: average
            }
            datasets.push(dataset);
        }

        let labels: string[] = [];
        for (let i = 0; i < this.props.solves.length; i++) {
            labels.push(i.toString());
        }
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels: labels,
            datasets: datasets
        }

        return data;
    }

    buildGoodBadData(goodTime: number, badTime: number) {
        let checkIfBad = (time: number) => { return time > badTime };
        let checkIfGood = (time: number) => { return time < goodTime }

        let movingPercentBad = calculateMovingPercentage(this.props.solves.map(x => x.time), this.props.windowSize, checkIfBad);
        let movingPercentGood = calculateMovingPercentage(this.props.solves.map(x => x.time), this.props.windowSize, checkIfGood);

        let labels = [];
        for (let i = 1; i <= movingPercentBad.length; i++) {
            labels.push(i.toString())
        };

        movingPercentBad = reduceDataset(movingPercentBad, this.props.pointsPerGraph);
        movingPercentGood = reduceDataset(movingPercentGood, this.props.pointsPerGraph);
        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Percentage of good solves over last ${this.props.windowSize}`,
                data: movingPercentGood
            },
            {
                label: `Percentage of bad solves over last ${this.props.windowSize}`,
                data: movingPercentBad
            }]
        }

        return data;
    }

    buildHistogramData() {
        let recentSolves = this.props.solves.map(x => x.time).slice(-this.props.windowSize);

        let histogram = new Map<number, number>();

        for (let i = 0; i < recentSolves.length; i++) {
            let val: number = Math.trunc(recentSolves[i]);
            if (!histogram.get(val)) {
                histogram.set(val, 0);
            }
            histogram.set(val, histogram.get(val)! + 1)
        }

        let arr = Array.from(histogram).sort((a, b) => {
            return a[0] - b[0];
        })

        let labels = arr.map(a => a[0]);
        let values = arr.map(a => a[1]);

        let data: ChartData<"bar"> = {
            labels: labels,
            datasets: [{
                label: `Number of solves by time (of recent ${this.props.windowSize})`,
                data: values
            }]
        }

        return data;
    }

    buildInspectionData() {
        let recentSolves = this.props.solves.slice(-this.props.windowSize);
        recentSolves.sort((a, b) => {
            return a.inspectionTime - b.inspectionTime;
        })

        let chunkedArr: Solve[][] = splitIntoChunks(recentSolves, Const.InspectionGraphChunks);

        let labels: string[] = [];
        let values: number[] = [];

        for (let i = 0; i < Const.InspectionGraphChunks; i++) {
            labels.push("~" + calculateAverage(chunkedArr[i].map(x => x.inspectionTime)).toFixed(2).toString());
            values.push(calculateAverage(chunkedArr[i].map(x => x.time)));
        }

        let data: ChartData<"bar"> = {
            labels: labels,
            datasets: [{
                label: `Solve time by inspection time (of recent ${this.props.windowSize})`,
                data: values
            }]
        }

        return data;
    }

    buildRecordHistory() {
        if (this.props.solves.length == 0) {
            return this.getEmptyChartData();
        }

        let records = [this.props.solves[0].time];
        let dates = [this.props.solves[0].date];

        for (let i = 1; i < this.props.solves.length; i++) {
            if (this.props.solves[i].time < records[records.length - 1]) {
                records.push(this.props.solves[i].time);
                dates.push(this.props.solves[i].date);
            }
        }

        let labels = dates.map(x => x.toDateString())

        let data: ChartData<"line"> = {
            labels: labels,
            datasets: [{
                label: `Current record`,
                data: records
            }]
        }

        return data;
    }

    buildRunningColorPercentages() {
        let checkIfWhite = (crossColor: CrossColor) => { return crossColor == CrossColor.White };
        let checkIfYellow = (crossColor: CrossColor) => { return crossColor == CrossColor.Yellow };
        let checkIfRed = (crossColor: CrossColor) => { return crossColor == CrossColor.Red };
        let checkIfOrange = (crossColor: CrossColor) => { return crossColor == CrossColor.Orange };
        let checkIfBlue = (crossColor: CrossColor) => { return crossColor == CrossColor.Blue };
        let checkIfGreen = (crossColor: CrossColor) => { return crossColor == CrossColor.Green };
        let checkIfUnknown = (crossColor: CrossColor) => { return crossColor == CrossColor.Unknown };

        let movingPercentWhite = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfWhite);
        let movingPercentYellow = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfYellow);
        let movingPercentRed = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfRed);
        let movingPercentOrange = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfOrange);
        let movingPercentBlue = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfBlue);
        let movingPercentGreen = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfGreen);
        let movingPercentUnknown = calculateMovingPercentage(this.props.solves.map(x => x.crossColor), this.props.windowSize, checkIfUnknown);

        let labels = [];
        for (let i = 1; i <= movingPercentWhite.length; i++) {
            labels.push(i.toString())
        };

        movingPercentWhite = reduceDataset(movingPercentWhite, this.props.pointsPerGraph);
        movingPercentYellow = reduceDataset(movingPercentYellow, this.props.pointsPerGraph);
        movingPercentRed = reduceDataset(movingPercentRed, this.props.pointsPerGraph);
        movingPercentOrange = reduceDataset(movingPercentOrange, this.props.pointsPerGraph);
        movingPercentBlue = reduceDataset(movingPercentBlue, this.props.pointsPerGraph);
        movingPercentGreen = reduceDataset(movingPercentGreen, this.props.pointsPerGraph);
        movingPercentUnknown = reduceDataset(movingPercentUnknown, this.props.pointsPerGraph);


        labels = reduceDataset(labels, this.props.pointsPerGraph);

        let data: ChartData<"line"> = {
            labels,
            datasets: [{
                label: `Percentage of solves with white cross over last ${this.props.windowSize}`,
                data: movingPercentWhite,
                borderColor: 'Black',
                backgroundColor: 'Black'
            }, {
                label: `Percentage of solves with yellow cross over last ${this.props.windowSize}`,
                data: movingPercentYellow,
                borderColor: 'Yellow',
                backgroundColor: 'Yellow'
            }, {
                label: `Percentage of solves with red cross over last ${this.props.windowSize}`,
                data: movingPercentRed,
                borderColor: 'Red',
                backgroundColor: 'Red'
            }, {
                label: `Percentage of solves with orange cross over last ${this.props.windowSize}`,
                data: movingPercentOrange,
                borderColor: 'Orange',
                backgroundColor: 'Orange'
            }, {
                label: `Percentage of solves with blue cross over last ${this.props.windowSize}`,
                data: movingPercentBlue,
                borderColor: 'Blue',
                backgroundColor: 'Blue'
            }, {
                label: `Percentage of solves with green cross over last ${this.props.windowSize}`,
                data: movingPercentGreen,
                borderColor: 'Green',
                backgroundColor: 'Green'
            }, {
                label: `Percentage of solves with unknown cross over last ${this.props.windowSize}`,
                data: movingPercentUnknown,
                borderColor: 'Purple',
                backgroundColor: 'Purple'
            }]
        }

        return data;
    }

    buildCaseData() {
        if (this.props.steps.length != 1 || (this.props.steps[0] !== StepName.OLL && this.props.steps[0] !== StepName.PLL)) {
            let data: ChartData<"bar"> = {
                labels: [],
                datasets: []
            }
            return data;
        }

        let solves = this.props.solves.slice(-this.props.windowSize);

        let caseTimes: { [id: string]: { recognitionTime: number, executionTime: number }[] } = {};
        for (let i = 0; i < solves.length; i++) {
            if (!(solves[i].steps[0].case in caseTimes)) {
                caseTimes[solves[i].steps[0].case] = [];
            }
            caseTimes[solves[i].steps[0].case].push({
                recognitionTime: solves[i].recognitionTime,
                executionTime: solves[i].executionTime
            });
        }

        let cases: { label: string, recognitionTime: number, executionTime: number }[] = []
        for (let key in caseTimes) {
            let recognitionTimes = caseTimes[key].map(x => x.recognitionTime);
            let executionTimes = caseTimes[key].map(x => x.executionTime);

            let averageRecognition: number = recognitionTimes.reduce((a, b) => a + b) / recognitionTimes.length;
            let averageExecution: number = executionTimes.reduce((a, b) => a + b) / executionTimes.length;

            cases.push({
                label: key,
                executionTime: averageExecution,
                recognitionTime: averageRecognition
            })
        }

        cases.sort((a, b) => {
            return (b.recognitionTime + b.executionTime) - (a.recognitionTime + a.executionTime);
        })

        let labels = cases.map(x => "Case: " + x.label);
        let recognitionValues = cases.map(x => x.recognitionTime)
        let executionValues = cases.map(x => x.executionTime)

        let data: ChartData<"bar"> = {
            labels: labels,
            datasets: [{
                label: `Average recognition time for each case in past ${this.props.windowSize} solves`,
                data: recognitionValues
            }, {
                label: `Average execution time for each case in past ${this.props.windowSize} solves`,
                data: executionValues
            }]
        }

        return data;
    }

    render() {
        // TODO: is there a better spot to put this?
        ChartJS.register(CategoryScale);

        let charts: JSX.Element[] = [];

        // Add charts that require exactly one step to be chosen
        if (this.props.steps.length == 1 && (this.props.steps[0] === StepName.OLL || this.props.steps[0] === StepName.PLL)) {
            charts.push(buildChartHtml(<Bar data={this.buildCaseData()} options={createOptions(ChartType.Bar, "Average Recognition Time and Execution Time per Case", "Solve Number", "Time (s)")} />));
        }

        // Add remaining charts
        charts.push(buildChartHtml(<Line data={this.buildRunningAverageData()} options={createOptions(ChartType.Line, "Average Time", "Solve Number", "Time (s)")} />));
        charts.push(buildChartHtml(<Line data={this.buildRunningRecognitionExecution()} options={createOptions(ChartType.Line, "Average Recognition and Execution", "Solve Number", "Time (s)")} />));
        charts.push(buildChartHtml(<Bar data={this.buildHistogramData()} options={createOptions(ChartType.Bar, "Count of Solves by How Long They Took", "Time (s)", "Count")} />));
        charts.push(buildChartHtml(<Line data={this.buildRunningTpsData()} options={createOptions(ChartType.Line, "Average Turns Per Second", "Solve Number", "Time (s)")} />));
        charts.push(buildChartHtml(<Line data={this.buildRunningTurnsData()} options={createOptions(ChartType.Line, "Average Turns", "Solve Number", "Turns")} />));
        charts.push(buildChartHtml(<Line data={this.buildRunningStdDevData()} options={createOptions(ChartType.Line, "Average Standard Deviation", "Solve Number", "Time (s)")} />));
        charts.push(buildChartHtml(<Line data={this.buildRunningColorPercentages()} options={createOptions(ChartType.Line, "Percentage of Solves by Cross Color", "Solve Number", "Percentage")} />));
        charts.push(buildChartHtml(<Bar data={this.buildInspectionData()} options={createOptions(ChartType.Bar, "Average solve time by inspection time", "Inspection Time (s)", "Solve Time (s)")} />));
        charts.push(buildChartHtml(<Line data={this.buildStepAverages()} options={createOptions(ChartType.Line, "Average Time by Step", "Solve Number", "Time (s)")} />));

        // Add charts that require 2+ steps
        if (this.props.steps.length >= 2) {
            charts.push(buildChartHtml(<Doughnut data={this.buildStepPercentages()} options={createOptions(ChartType.Doughnut, "Percentage of the Solve Each Step Took", "", "")} />));
        }

        // Add charts that require all steps to be chosen
        if (this.props.steps.length == Const.MethodSteps[this.props.methodName].length) {
            charts.push(buildChartHtml(<Line data={this.buildGoodBadData(this.props.goodTime, this.props.badTime)} options={createOptions(ChartType.Line, "Percentage of 'Good' and 'Bad' Solves", "Solve Number", "Percentage")} />));
            charts.push(buildChartHtml(<Line data={this.buildRecordHistory()} options={createOptions(ChartType.Line, "History of Records", "Date", "Time (s)")} />))
        }

        return (
            <div>
                <br />
                <Row>
                    {charts}
                </Row>
            </div>
        )
    }
}