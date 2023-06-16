// TODO: Add comments
// TODO: 

/* Modulos para manipular archivos */
const { createInterface } = require('readline');
const { Readable } = require('stream');
const TIME_FRAMES_TITLES = ['Optical density', 'Fluorescence', '?1', '?2'];

function getFileRows(fileToRead) {
    /* Secciona el codigo separandolo por "enter" */
    const fileDataRows = createInterface({
        input: Readable.from(fileToRead.data),
        crlfDelay: Infinity
    });
    return fileDataRows;
};

function cleanTimeSection(timeSectionHeaders, timeSectionDataRows) {
    for (let currentColumn = 0; currentColumn < timeSectionHeaders.length; currentColumn++) {
        const CURRENT_COLUMN_HEADER = timeSectionHeaders[currentColumn].substring(1);
        if (!isNaN(Number(CURRENT_COLUMN_HEADER))) {
            const timeframesTimes = [];
            timeSectionHeaders.splice(0, currentColumn);
            timeSectionDataRows.forEach(timeSectionDataRow => {
                timeframesTimes.push(timeSectionDataRow[0]);
                timeSectionDataRow.splice(0, currentColumn);
            });
            return { timeSectionHeaders, timeSectionDataRows, timeframesTimes };
        }
    };
};

// TODO: Manage timefaramse
function groupAverageByLetter(timeSectionHeaders, timeSectionDataRows, timeframesTimes) {
    /* TODO: Extract average with dynamic columns */
    let columnsCounter = undefined;
    const LETTER_AVERAGE = {};

    for (let currentColumn = 0; currentColumn < timeSectionHeaders.length; currentColumn++) {
        if (Number(columnsCounter) > Number(timeSectionHeaders[currentColumn].slice(1))) break;
        columnsCounter = timeSectionHeaders[currentColumn].slice(1);
    }

    for (let currentColumn = 0; currentColumn < timeSectionHeaders.length; currentColumn += Number(columnsCounter)) {
        const LETTER_HEADER = timeSectionHeaders[currentColumn][0];

        for (let currentDataRow = 0; currentDataRow < timeSectionDataRows.length; currentDataRow++) {
            if (!LETTER_AVERAGE[LETTER_HEADER]) LETTER_AVERAGE[LETTER_HEADER] = {};
            if (!LETTER_AVERAGE[LETTER_HEADER][currentDataRow]) LETTER_AVERAGE[LETTER_HEADER][currentDataRow] = 0;

            const bottomLimit = currentColumn ? currentColumn : 0;
            const topLimit = currentColumn ? currentColumn + 12 : 12;

            for (let currentLetter = bottomLimit; currentLetter < topLimit; currentLetter++) {
                if (isNaN(Number(timeSectionDataRows[currentDataRow][currentLetter]))) continue;
                LETTER_AVERAGE[LETTER_HEADER][currentDataRow] += Number(timeSectionDataRows[currentDataRow][currentLetter]);
            }

            LETTER_AVERAGE[LETTER_HEADER][currentDataRow] /= Number(columnsCounter);
        }
    }

    return LETTER_AVERAGE;
};

function getAllCommonIndexes(arr, val) {
    const COMMON_INDEXES = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] === val) {
            COMMON_INDEXES.push(i);
        }
    }
    return COMMON_INDEXES;
}

function groupAverageByNumber(timeSectionHeaders, timeSectionDataRows, timeframesTimes) {
    let maxNumberOfColumns = 0;
    const ALL_COLUMN_NUMBERS = [];
    const NUMBERS_DATA = [];
    const ALL_NUMBERS_AVERAGE = {};
    const CURRENT_NUMBER_DATA_MERGED = {}

    for (let currentHeader = 0; currentHeader < timeSectionHeaders.length; currentHeader++) {
        const COLUMN_NUMBER = Number(timeSectionHeaders[currentHeader].slice(1));
        ALL_COLUMN_NUMBERS.push(COLUMN_NUMBER);
        COLUMN_NUMBER > maxNumberOfColumns && (maxNumberOfColumns = COLUMN_NUMBER);
    }

    timeSectionDataRows.forEach((timeSectionDataRow, timeframeIndex) => {
        !NUMBERS_DATA[timeframeIndex] && (NUMBERS_DATA[timeframeIndex] = []);
        for (let columnNumber = 0; columnNumber < maxNumberOfColumns; columnNumber++) {
            !NUMBERS_DATA[timeframeIndex][columnNumber] && (NUMBERS_DATA[timeframeIndex][columnNumber] = []);
            getAllCommonIndexes(ALL_COLUMN_NUMBERS, columnNumber + 1).forEach(columnNumberIndex => {
                NUMBERS_DATA[timeframeIndex][columnNumber].push(timeSectionDataRow[Number(columnNumberIndex)]);
            });
        }

    });

    NUMBERS_DATA.forEach((rowDataByNumbers, rowDataNumberIndex) => {
        ALL_NUMBERS_AVERAGE[`row-${Number(rowDataNumberIndex) + 1}`] = {};
        rowDataByNumbers.forEach((numberData, number) => {
            ALL_NUMBERS_AVERAGE[`row-${Number(rowDataNumberIndex) + 1}`][`${Number(number) + 1}`] = numberData.reduce((a, b) => Number(a) + Number(b), 0) / numberData.length;
        })
    });

    for (let numberIndex = 1; numberIndex <= maxNumberOfColumns; numberIndex++) {
        !CURRENT_NUMBER_DATA_MERGED[numberIndex] && (CURRENT_NUMBER_DATA_MERGED[numberIndex] = {});
        timeframesTimes.forEach((timeframeTime, timeframeIndex) => {
            const CURRENT_ROW_DATA = ALL_NUMBERS_AVERAGE[`row-${timeframeIndex + 1}`];
            !CURRENT_NUMBER_DATA_MERGED[numberIndex][timeframeTime] && (CURRENT_NUMBER_DATA_MERGED[numberIndex][timeframeTime] = 0);
            CURRENT_NUMBER_DATA_MERGED[numberIndex][timeframeTime] = CURRENT_ROW_DATA[String(numberIndex)];
        });
    }

    return CURRENT_NUMBER_DATA_MERGED;
}

function arrangeDataToPlot(dataToPlot) {
    const ALL_DATA_TO_PLOT = [];
    let CURRENT_DATA_TO_PLOT = [];
    const TIMES_OF_MEASUREMENT = dataToPlot[0]['1'] ? Object.keys(dataToPlot[0]['1']) : [];

    dataToPlot.forEach((timeFrameSection, i) => {
        CURRENT_DATA_TO_PLOT = [];
        for (currentLetter of Object.keys(timeFrameSection)) {
            CURRENT_DATA_TO_PLOT.push({
                label: currentLetter,
                data: Object.values(timeFrameSection[currentLetter]),
            });
        }
        ALL_DATA_TO_PLOT.push(CURRENT_DATA_TO_PLOT);
    });

    return [ALL_DATA_TO_PLOT, TIMES_OF_MEASUREMENT];
};

function processTimeSectionsData(allTimeSectionsData) {
    const TIME_SECTIONS_DATA = [];
    const NUMBERS_SECTIONS_DATA = [];
    const SPECIFIC_ACTIVITY_SECTIONS_DATA = [];
    const SPECIFIC_ACTIVITY = {};
    let TIME_SECTION_HEADERS_AUX = [];

    allTimeSectionsData.forEach((timeSection, i) => {
        const [TIME_SECTION_HEADERS, ...TIME_SECTION_DATA_ROWS] = timeSection;
        const { timeSectionHeaders, timeSectionDataRows, timeframesTimes } = cleanTimeSection(TIME_SECTION_HEADERS, TIME_SECTION_DATA_ROWS);
        TIME_SECTION_HEADERS_AUX = timeSectionHeaders;
        (i === 0 || i === 1) && SPECIFIC_ACTIVITY_SECTIONS_DATA.push(timeSectionDataRows);
        const numberAverageByRow = groupAverageByNumber(timeSectionHeaders, timeSectionDataRows, timeframesTimes);
        const letterAverageByTimeFrame = groupAverageByLetter(timeSectionHeaders, timeSectionDataRows, timeframesTimes);
        NUMBERS_SECTIONS_DATA.push(numberAverageByRow);
        TIME_SECTIONS_DATA.push(letterAverageByTimeFrame);
    });

    const [DATA_TO_PLOT, TIMES_OF_MEASUREMENT] = arrangeDataToPlot(TIME_SECTIONS_DATA);
    const [DATA_TO_PLOT2, TIMES_OF_MEASUREMENT2] = arrangeDataToPlot(NUMBERS_SECTIONS_DATA);

    SPECIFIC_ACTIVITY_SECTIONS_DATA[0].forEach((timeFrameData, i) => {
        !SPECIFIC_ACTIVITY[`Time ${i + 1}`] && (SPECIFIC_ACTIVITY[`Time ${i + 1}`] = {});

        timeFrameData.forEach((value, k) => {
            !SPECIFIC_ACTIVITY[`Time ${i + 1}`][TIME_SECTION_HEADERS_AUX[k]] && (SPECIFIC_ACTIVITY[`Time ${i + 1}`][TIME_SECTION_HEADERS_AUX[k]] = 0);
            SPECIFIC_ACTIVITY_SECTIONS_DATA.forEach((_, j) => {
                SPECIFIC_ACTIVITY[`Time ${i + 1}`][TIME_SECTION_HEADERS_AUX[k]] = SPECIFIC_ACTIVITY_SECTIONS_DATA[1][i][k] / SPECIFIC_ACTIVITY_SECTIONS_DATA[0][i][k];
            });
        });
    });

    return [TIMES_OF_MEASUREMENT2, SPECIFIC_ACTIVITY, DATA_TO_PLOT, DATA_TO_PLOT2];
};

async function extractTimeSections(fileToRead) {
    let isInTimeSection = false;
    let analizingTimeSectionData = -1;
    const allTimeSectionsData = [];

    const fileDataRows = getFileRows(fileToRead);

    /* Itera sobre cada fila para analizar su contenido */
    for await (const fileDataRow of fileDataRows) {
        const currentFileRow = fileDataRow.split('\t');
        if (currentFileRow.length < 3) continue; /* Para evitar el time de la metadata del arcivo */

        if (currentFileRow[0] === 'Time') {
            analizingTimeSectionData++;
            allTimeSectionsData[analizingTimeSectionData] = [];
            isInTimeSection = true;
        } else if (currentFileRow[0] === '' || isNaN(Number(currentFileRow[0][0]))) {
            isInTimeSection = false
        }

        if (isInTimeSection) {
            allTimeSectionsData[analizingTimeSectionData].push(currentFileRow);
        }
    }

    const [MEASUREMENT_TIMES, SPECIFIC_ACTIVITY, ...PROCESSED_DATA] = processTimeSectionsData(allTimeSectionsData);
    return [MEASUREMENT_TIMES, SPECIFIC_ACTIVITY, PROCESSED_DATA];
};

module.exports = {
    TIME_FRAMES_TITLES,
    extractTimeSections
};
