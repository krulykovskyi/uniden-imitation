const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const format = require("date-fns/format");

const sleep = () => {
    return new Promise((resolve) => {
        setTimeout(resolve, 120 * 1000);
    });
}

(async () => {
    let availableDaysFolders =
      (await fs.readdir(path.join(__dirname, '..', 'recs-source')))
        .filter((folderName) => folderName.match(/\d{2}-\d{2}-\d{2}/));

    const foldersToRecordsMap = {};

    for (let folderName of availableDaysFolders) {
        const pathToRecords = path.join(__dirname, '..', 'recs-source', folderName);
        const records = await fs.readdir(pathToRecords);

        for (let i = 0; i < records.length; i++) {
            const creationTime =
              new Date((await fs.stat(path.join(pathToRecords, records[i]))).birthtimeMs);

            const millisecondsFromMidnight =
              ((creationTime.getHours() + 1) * 60 * 60 * 1000)
              + (creationTime.getMinutes() * 60 * 1000)
              + (creationTime.getSeconds() * 1000)
              + creationTime.getMilliseconds();

            records[i] = {
                recordName: records[i],
                millisecondsFromMidnight,
            }
        }

        foldersToRecordsMap[folderName] = records;
    }

    const pathWhereToCopy = path.join(__dirname, '..', 'REC');
    let currentFolderIndex = 0;
    const copyRecords = async () => {
        let currentFolderName = availableDaysFolders[currentFolderIndex];
        const recordsListToCopy = foldersToRecordsMap[currentFolderName];

        const recordsToCopy = recordsListToCopy.filter((record) => {
            const recordDayMsFromMidnight = record.millisecondsFromMidnight;
            const today = new Date();
            const nowdayCreationTimeMS =
              (today.getHours()  * 60 * 60 * 1000)
              + (today.getMinutes() * 60 * 1000)
              + (today.getSeconds() * 1000)
              + today.getMilliseconds();

            return nowdayCreationTimeMS - recordDayMsFromMidnight <= 5000
              && nowdayCreationTimeMS - recordDayMsFromMidnight >= 0;
        })

        if(new Date().getHours() === 23 && new Date().getMinutes() === 59) {
            await sleep();
            currentFolderIndex++;
        }

        const destinationFolderPath = path.join(pathWhereToCopy, currentFolderName);
        const isFolderForRecordsExists = fsSync.existsSync(destinationFolderPath);

        if(!isFolderForRecordsExists) {
            await fs.mkdir(destinationFolderPath);
        }

        console.log('isFolderForRecordsExists', isFolderForRecordsExists);
        console.log('recordsToCopy', recordsToCopy);

        for (let { recordName } of recordsToCopy) {
            const sourceFilePath = path.join(__dirname, '..', 'recs-source', currentFolderName, recordName);
            const destinationFilePath = path.join(__dirname, '..', 'REC', currentFolderName, recordName);

            await fs.copyFile(sourceFilePath, destinationFilePath);
        }
    }

    setInterval(copyRecords, 5000)
})()
