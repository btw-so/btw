function stringToHex(string) {
    var hex = "";
    for (var i = 0; i < string.length; i++) {
        var code = string.charCodeAt(i).toString(16);
        if (code.length === 1) {
            code = "0" + code;
        }
        hex += code;
    }
    return hex;
}

function convertDDMMYYYYtoDate(string) {
    try {
        var dateParts = dateString.split("/");

        // month is 0-based, that's why we need dataParts[1] - 1
        var dateObject = new Date(
            +dateParts[2],
            dateParts[1] - 1,
            +dateParts[0],
        );
        return dateObject;
    } catch (err) {
        return new Date();
    }
}

function getNow() {
    return Date.now();
}

function getDayId() {
    const dd = new Date(getNow()).getDate();
    const mm = new Date(getNow()).getMonth() + 1;
    const yyyy = new Date(getNow()).getFullYear();

    return `${dd < 10 ? "0" + dd : dd}-${mm < 10 ? "0" + mm : mm}-${yyyy}`;
}

function getNowId(now) {
    now = now || getNow();
    const id = stringToHex("" + now);
    return id;
}

function convertDateInUTCToLocal(date, offsetInSeconds) {
    const utcDate = new Date(date);
    const localDate = new Date(utcDate.getTime() + offsetInSeconds * 1000);
    return localDate;
}

function getReadableWeekDayFromUTCToLocal(date, offsetInSeconds) {
    const localDate = convertDateInUTCToLocal(date, offsetInSeconds);

    return localDate.toLocaleString("default", { weekday: "long" });
}

function getDDMMYYYYFromUTCToLocal(date, offsetInSeconds) {
    const localDate = convertDateInUTCToLocal(date, offsetInSeconds);
    const dd = localDate.getDate();
    const mm = localDate.getMonth() + 1;
    const yyyy = localDate.getFullYear();

    return `${dd < 10 ? "0" + dd : dd}-${mm < 10 ? "0" + mm : mm}-${yyyy}`;
}

function getHHMMSSFromUTCToLocal(date, offsetInSeconds) {
    const localDate = convertDateInUTCToLocal(date, offsetInSeconds);
    const hh = localDate.getHours();
    const mm = localDate.getMinutes();
    const ss = localDate.getSeconds();

    return `${hh < 10 ? "0" + hh : hh}:${mm < 10 ? "0" + mm : mm}:${
        ss < 10 ? "0" + ss : ss
    }`;
}

function convertLocalTimeToUTC(ddmmyyy, hhmmss, offsetInSeconds) {
    let [dd, mmm, yyyy] = ddmmyyy.split("/");
    let hh = 0;
    let mm = 0;
    let ss = 0;

    // in hhmmss it could be hh:mm:ss or hh:mm
    const hhmmssParts = hhmmss.split(":");
    if (hhmmssParts.length === 2) {
        hh = hhmmssParts[0];
        mm = hhmmssParts[1];
    }
    if (hhmmssParts.length === 3) {
        hh = hhmmssParts[0];
        mm = hhmmssParts[1];
        ss = hhmmssParts[2];
    }

    dd = Number(dd);
    mmm = Number(mmm);
    yyyy = Number(yyyy);
    hh = Number(hh);
    mm = Number(mm);
    ss = Number(ss);

    const localDate = new Date(+yyyy, +mmm - 1, +dd, +hh, +mm, +ss);

    const utcDate = new Date(localDate.getTime() - offsetInSeconds * 1000);
    return utcDate;
}

function getReadableDayFromDiff(dUTC, offsetInSeconds) {
    // return "today", "tomorrow", Mon/Tue/Wed/Thu/Fri/Sat/Sun (if the date is in this week, week starts from Monday to Sunday)
    // If the date is not in this week, return Jan 2 if it is in this year
    // If the date is not in this year, return Jan 2, 2006
    const today = new Date();
    const todayInLocal = convertDateInUTCToLocal(today, offsetInSeconds);
    const todayDay = todayInLocal.getDate();
    const todayMonth = todayInLocal.getMonth();
    const todayYear = todayInLocal.getFullYear();
    const todayWeekDay = todayInLocal.getDay();
    const todayWeekDayString = todayInLocal.toLocaleString("default", {
        weekday: "short",
    });
    const todayWeekDayStringLong = todayInLocal.toLocaleString("default", {
        weekday: "long",
    });

    const localDate = convertDateInUTCToLocal(dUTC, offsetInSeconds);
    const localDay = localDate.getDate();
    const localMonth = localDate.getMonth();
    const localYear = localDate.getFullYear();
    const localWeekDay = localDate.getDay();
    const localWeekDayString = localDate.toLocaleString("default", {
        weekday: "short",
    });
    const localWeekDayStringLong = localDate.toLocaleString("default", {
        weekday: "long",
    });

    // getTimeInSeconds of today at 00:00:00 and getTimeInSeconds of localDate at 00:00:00. then take a diff of both and divide by seconds in a day, floor it to get actual daydiff
    const todayMidnight = new Date(todayYear, todayMonth, todayDay, 0, 0, 0);
    const localDateMidnight = new Date(
        localYear,
        localMonth,
        localDay,
        0,
        0,
        0,
    );
    const diff = Math.floor(
        (localDateMidnight.getTime() - todayMidnight.getTime()) /
            (1000 * 60 * 60 * 24),
    );

    if (diff === 0) {
        return "today";
    }

    if (diff === 1) {
        return "tomorrow";
    }

    const weekDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];
    const todayWeekdayIndex = weekDays.indexOf(todayWeekDayStringLong);
    const allowedWeekdays = weekDays.slice(todayWeekdayIndex);

    if (
        diff >= 2 &&
        diff <= 6 &&
        allowedWeekdays.includes(localWeekDayStringLong)
    ) {
        return localWeekDayStringLong;
    }

    if (localYear === todayYear) {
        // return Aug 2
        const month = localDate.toLocaleString("default", { month: "short" });
        return `${month} ${localDay}`;
    }

    // return Aug 2, 2006
    const month = localDate.toLocaleString("default", { month: "short" });
    return `${month} ${localDay}, ${localYear}`;
}

function getReadableFromUTCToLocal(
    date,
    offsetInSeconds,
    {
        onlyDateIfEndToEnd,
        readableDateIgnoreTime,
        readableTimeAndDate,
        onlyDate,
    } = {},
) {
    // return in Jan 2, 2006 3:04 PM
    const localDate = convertDateInUTCToLocal(date, offsetInSeconds);
    const month = localDate.toLocaleString("default", { month: "short" });
    const day = localDate.getDate();
    const year = localDate.getFullYear();
    const hours = localDate.getHours();
    const minutes = localDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;

    if (
        onlyDate ||
        (onlyDateIfEndToEnd &&
            ((hours12 === 12 && minutes === 0 && ampm === "AM") ||
                (hours12 === 11 && minutes === 59 && ampm === "PM")))
    ) {
        return `${month} ${day}`;
    }

    if (readableDateIgnoreTime) {
        return getReadableDayFromDiff(date, offsetInSeconds);
    }

    if (readableTimeAndDate) {
        return `${hours12}:${minutes < 10 ? `0${minutes}` : minutes} ${ampm} ${getReadableDayFromDiff(date, offsetInSeconds)}`;
    }

    return `${month} ${day}, ${year} ${hours12}:${
        minutes < 10 ? `0${minutes}` : minutes
    } ${ampm}`;
}

module.exports = {
    stringToHex,
    convertDDMMYYYYtoDate,
    getNow,
    getNowId,
    getDayId,
    convertDateInUTCToLocal,
    getDDMMYYYYFromUTCToLocal,
    getHHMMSSFromUTCToLocal,
    convertLocalTimeToUTC,
    getReadableFromUTCToLocal,
    getReadableWeekDayFromUTCToLocal,
};
