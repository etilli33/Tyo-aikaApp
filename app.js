//Debugging flag to switch on console printing
const debugging = false;

let AppController = (function () {
  let date = new Date();
  let data = {
    logs: [
      /*
        in: [{
          //log: new Date(),
          //type: ''
        }],
        out: [{
          //log: new Date(),
          //type: ''
        }],
        date: new Date(0),//new Date(date.getFullYear, date.getMonth, date.getDate),//represents the day
        saldo: 0
        */
    ], //array with objects with properties day (yyyy/dd/mm), out and in arrays + dailySaldo saved
    mostRecent: {
      type: "",
      time: 0,
    },
    workingTime: 26100000, //26460000,
    saldo: 0,
    startingSaldo: 0,
    dailySaldo: [], //array of objects with date and saldo pairs
    name: "",
  };

  if (debugging) {
    window.data = data;
  }

  let calcDayString = function (now) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };
  let countOwnOutSaldo = function (obj) {
    let outTimeArray = [0];
    if (obj.out.find((el) => el.type)) {
      let inArray = obj.in.map((el) => el.log);
      let outArray = obj.out
        .filter((el) => el.type === "OAS")
        .map((el) => el.log);
      //find next bigger entry from out in the in-array, then do in-entry - out-entry

      for (let i = 0; i < outArray.length; i++) {
        let nextIn = inArray.find((el) => el > outArray[i]);
        //nextIn can be undefined, if user has not yet come back from OwnOut
        if (nextIn) {
          outTimeArray.push(nextIn - outArray[i]);
        }
      }
      return outTimeArray;
    }
  };

  return {
    // Calculate the current saldo up to now if user is logged in
    calcSaldoNow: function () {
      // Only calculate saldo now if user is logged in (SISÄÄN)
      if (data.mostRecent.type !== "SISÄÄN") {
        return;
      }
      // Find today's log
      const today = new Date();
      const todayString = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const todayLog = data.logs.find(
        (log) => log.date.getTime() === todayString.getTime()
      );
      if (!todayLog || todayLog.in.length === 0) {
        return;
      }
      // Find the first IN of today
      const firstIn = todayLog.in.map((e) => e.log).sort()[0];
      // Find the last OUT after first IN, if any
      let lastOut = null;
      if (todayLog.out.length > 0) {
        // Only consider OUTs after first IN
        const outsAfterIn = todayLog.out
          .map((e) => e.log)
          .filter((l) => l > firstIn);
        if (outsAfterIn.length > 0) {
          lastOut = Math.max(...outsAfterIn);
        }
      }
      // Calculate working time for today: from first IN to now (or last OUT if after IN)
      let endTime = Date.now();
      if (lastOut && lastOut > firstIn) {
        endTime = lastOut;
      }
      let workingDay = endTime - firstIn;
      // Subtract own out saldo for today
      let ownSaldo = 0;
      if (typeof countOwnOutSaldo === "function") {
        const arr = countOwnOutSaldo(todayLog);
        if (arr) ownSaldo = arr.reduce((a, b) => a + b, 0);
      }
      // Calculate saldo for today so far
      let saldoToday = workingDay - data.workingTime - ownSaldo;
      // Add saldo from previous days
      let totalSaldo = 0;
      for (let i = 0; i < data.logs.length; i++) {
        if (data.logs[i].date.getTime() !== todayString.getTime()) {
          totalSaldo += data.logs[i].saldo;
        }
      }
      // Add startingSaldo
      return this.toHours(totalSaldo + saldoToday + data.startingSaldo);
    },
    // Setting data into local storage
    storeData: function () {
      if (typeof Storage !== "undefined") {
        localStorage.setItem("data", JSON.stringify(data));
        console.log("Data stored");
      }
    },

    // Getting data from local storage
    getStoredData: function () {
      if (typeof Storage !== "undefined") {
        var localData = JSON.parse(localStorage.getItem("data"));
        //make backup
        localStorage.setItem("backup", JSON.stringify(localData));
        return localData;
      }
    },
    //update Data to work with
    updateData: function (storedData) {
      data.saldo = storedData.saldo;
      data.workingTime = storedData.workingTime;
      data.mostRecent = storedData.mostRecent;
      data.mostRecent.time = new Date(data.mostRecent.time);
      data.dailySaldo = storedData.dailySaldo;
      data.startingSaldo = storedData.startingSaldo;
      data.name = storedData.name;
      //new data structure:
      if (storedData.logs.length > 0) {
        data.logs = storedData.logs;
        for (var i = 0; i < data.logs.length; i++) {
          data.logs[i].date = new Date(data.logs[i].date);
          for (var e = 0; e < data.logs[i].out.length; e++) {
            data.logs[i].out[e].log = new Date(data.logs[i].out[e].log);
          }
          for (var u = 0; u < data.logs[i].in.length; u++) {
            data.logs[i].in[u].log = new Date(data.logs[i].in[u].log);
          }
        }
      }
    },
    updateStartingSaldo: function () {
      const DOM = UIController.getDOMStrings();
      data.startingSaldo < 0
        ? (document.querySelector(DOM.workingTimeSaldoType).value = "-")
        : (document.querySelector(DOM.workingTimeSaldoType).value = "+");
      document.querySelector(DOM.workingTimeSaldo).value = this.toHours(
        Math.abs(data.startingSaldo)
      );
    },
    updateWorkingTimePercent: function () {
      const DOM = UIController.getDOMStrings();
      document.querySelector(DOM.workingTimeInput).value = this.toHours(
        data.workingTime
      );
      UIController.updatePercent();
    },
    updateName: function () {
      const DOM = UIController.getDOMStrings();
      document.querySelector(DOM.settingName).value = data.name;
    },
    getName: function () {
      if (data.name && data.name.length > 0) {
        return data.name.trim();
      } else {
        return "";
      }
    },
    getTime: function () {
      //adds zeros to the output, if needed
      function checkTime(i) {
        return i < 10 ? "0" + i : i;
      }
      let now, hour, minutes;
      now = new Date();
      hour = now.getHours();
      minutes = now.getMinutes();
      return hour + ":" + minutes;
    },
    addEmptyDay: function (dayString) {
      if (
        !data.logs.some((el) => el.date) ||
        !data.logs.some((el) => el.date.getTime() === dayString.getTime())
      ) {
        let dayObject = {};
        dayObject.date = dayString;
        dayObject.in = [];
        dayObject.out = [];
        dayObject.saldo = 0;
        data.logs.push(dayObject);
      }
    },
    addLogging: function (type, addition) {
      let now, dayString, item, nowObj;
      now = new Date();
      //new Data structure
      //get today-string
      dayString = calcDayString(now);
      // if day is not there  create it
      if (type !== data.mostRecent.type) {
        this.addEmptyDay(dayString);
      }

      item =
        data.logs[
          data.logs.findIndex((el) => el.date.getTime() === dayString.getTime())
        ];

      if (addition) {
        nowObj = { log: now, type: addition };
      } else {
        nowObj = { log: now };
      }
      if (type === "SISÄÄN" && data.mostRecent.type !== "SISÄÄN") {
        item.in.push(nowObj);
        data.mostRecent.type = type;
        data.mostRecent.time = now;
        console.log("New SISÄÄN registered.");
      } else if (type === "ULOS" && data.mostRecent.type !== "ULOS") {
        item.out.push(nowObj);
        data.mostRecent.type = type;
        data.mostRecent.time = now;
        console.log("New ULOS registered.");
      }
    },
    processCorrection: function (date, time, type) {
      let OASObj, item, logTime;
      const myDate = new Date(date); //does'n yet understand time zones, so needs conversion
      const dayString = calcDayString(myDate);
      //If there is no logging at that day, create date object
      this.addEmptyDay(dayString);
      //Fill in the logging details
      item =
        data.logs[
          data.logs.findIndex((el) => el.date.getTime() === dayString.getTime())
        ];
      logTime = new Date(date + "T" + time);
      if (type === "OAS") {
        OASObj = { log: logTime, type: "OAS" };
      } else {
        OASObj = { log: logTime };
      }
      if (debugging) {
        console.log("Item to be added:");
        console.log(OASObj);
      }
      if (type === "SISÄÄN") {
        item.in.push(OASObj);
      } else if (type === "ULOS" || type === "OAS") {
        item.out.push(OASObj);
      }
      //Now calculate saldo of that day
      //works only if there is already OUT
      let mostRecentOut,
        firstLoginToday,
        workingDay,
        ownSaldo,
        ownSaldoArray,
        totalSaldo,
        saldoToday;

      //get most recent logout.
      if (item.out && item.out.length > 0) {
        for (let i = 0; i < item.out.length; i++) {
          mostRecentOut > item.out[i].log
            ? mostRecentOut
            : (mostRecentOut = item.out[i].log);
        }
        if (debugging) {
          console.log("Most recent out from processCorrection:");
          console.log(mostRecentOut);
        }
        //calculate smallest amount, i.e. the first event in that array
        if (item.in && item.in.length > 0) {
          firstLoginToday = item.in.sort(function (a, b) {
            return a.log - b.log;
          })[0].log;
          if (debugging) {
            console.log("First login today from processCorrection");
            console.log(firstLoginToday);
          }
          // calculate difference
          workingDay = mostRecentOut - firstLoginToday;
        }
        if (debugging) {
          console.log("Working day: " + this.toHours(workingDay));
        }
        //take into account also login and logouts in between and their reasons
        ownSaldoArray = countOwnOutSaldo(item);
        //Prepare own saldo, so it is not undefined
        ownSaldo = 0;
        const arraySum = (arr) => arr.reduce((a, b) => a + b, 0);
        //calc only if own loggings have happened:
        if (ownSaldoArray) {
          if (debugging) {
            console.log("own saldo:");
            console.log(ownSaldoArray);
          }
          ownSaldo = arraySum(ownSaldoArray);
          if (debugging) {
            console.log("Own saldo sum");
            console.log(this.toHours(ownSaldo));
          }
          //write it into memory
          data.logs[
            data.logs.findIndex(
              (el) => el.date.getTime() === item.date.getTime()
            )
          ].ownSaldo = ownSaldo;
          //remove sum of ownOut from workingDay
          //workingDay = workingDay - ownSaldo;
        }
        //compare to workingTime
        saldoToday = 0;
        if (workingDay || !isNaN(workingDay)) {
          saldoToday = workingDay - data.workingTime - ownSaldo;
        }
        //write saldoToday into memory
        data.logs[
          data.logs.findIndex((el) => el.date.getTime() === item.date.getTime())
        ].saldo = saldoToday;
      }
    },
    saveLoggingType: function (string) {
      //for future use
    },
    mostRecentLogging: function () {
      return data.mostRecent;
    },
    mostRecentDay: function (index) {
      let sorted = data.logs.sort((a, b) => b.date - a.date);
      return sorted[index];
    },
    mostRecentOut: function () {
      //check first with mostRecentDay, in which object you have to start calculating
      let obj = this.mostRecentDay(0);
      let mostRecentOut; //Saves date in MS
      for (let i = 0; i < obj.out.length; i++) {
        mostRecentOut > obj.out[i].log
          ? mostRecentOut
          : (mostRecentOut = obj.out[i].log);
      }
      return mostRecentOut;
    },
    calcDailySaldo: function (date) {
      const loggings = AppController.getEditableLogs(date);
      if (debugging) {
        console.log("Loggings from calcDailySaldo:");
        console.log(loggings);
        console.log("date is " + date);
      }

      if (loggings && loggings.length > 0) {
        let saldo = 0;
        let ownSaldo = 0; //is zero if no own loggings
        if (loggings[0].out.length > 0 && loggings[0].in.length > 0) {
          //There needs to be at least one out
          const lastOut = loggings[0].out.sort((a, b) => b.log - a.log)[0].log;
          const firstLogin = loggings[0].in.sort(function (a, b) {
            return a.log - b.log;
          })[0].log;
          const workingDay = lastOut - firstLogin;
          const ownSaldoArray = countOwnOutSaldo(loggings[0]);

          if (ownSaldoArray) {
            ownSaldo = ownSaldoArray.reduce((a, b) => a + b, 0);
            if (debugging) {
              console.log("Own saldo array:");
              console.log(ownSaldoArray);
            }
          }
          if (debugging) {
            console.log("Own saldo = " + this.toHours(ownSaldo));
          }
          //loggings[0].ownSaldo = ownSaldo;

          //update also saldo
          saldo = workingDay - data.workingTime - ownSaldo;
        }
        //Safe to real data:
        const realLoggings =
          data.logs[
            data.logs.findIndex(
              (el) => el.date.getTime() === loggings[0].date.getTime()
            )
          ];
        if (realLoggings) {
          realLoggings.ownSaldo = ownSaldo;
          realLoggings.saldo = saldo;
        }
      }
    },
    calcSaldo: function () {
      //should be called only after logout
      let obj,
        mostRecentOut,
        firstLoginToday,
        workingDay,
        ownSaldo,
        ownSaldoArray,
        totalSaldo,
        saldoToday;
      obj = this.mostRecentDay(0);
      if (obj && obj.in.length > 0 && obj.in) {
        //get most recent logout.
        mostRecentOut = this.mostRecentOut();

        //calculate smallest amount, i.e. the first event in that array
        firstLoginToday = obj.in.sort(function (a, b) {
          return a.log - b.log;
        })[0].log;

        // calculate difference
        workingDay = mostRecentOut - firstLoginToday;

        //take into account also login and logouts in between and their reasons
        ownSaldoArray = countOwnOutSaldo(obj);
        //Prepare own saldo, so it is not undefined
        ownSaldo = 0;
        const arraySum = (arr) => arr.reduce((a, b) => a + b, 0);
        //calc only if own loggings have happened:
        if (ownSaldoArray) {
          ownSaldo = arraySum(ownSaldoArray);
          if (debugging) {
            console.log("Own saldo from calcSaldo:");
            console.log(this.toHours(ownSaldo));
          }
          //write it into memory
          data.logs[
            data.logs.findIndex(
              (el) => el.date.getTime() === obj.date.getTime()
            )
          ].ownSaldo = ownSaldo;
          //remove sum of ownOut from workingDay
          //workingDay = workingDay - ownSaldo;
        }
        //compare to workingTime
        saldoToday = 0;
        if (workingDay || !isNaN(workingDay)) {
          saldoToday = workingDay - data.workingTime - ownSaldo;
        }
        //write saldoToday into memory
        data.logs[
          data.logs.findIndex((el) => el.date.getTime() === obj.date.getTime())
        ].saldo = saldoToday;
      }
    },
    getSaldo: function () {
      let totalSaldo = 0;
      for (i in data.logs) {
        totalSaldo += data.logs[i].saldo;
      }
      if (debugging) {
        console.log("Koko Saldo: " + totalSaldo);
        console.log(
          "Koko saldo plus aloitussaldo: " + (totalSaldo + data.startingSaldo)
        );
      }
      //take startingSaldo only here into account
      return this.toHours(totalSaldo + data.startingSaldo);
    },
    setWorkingTime: function (time) {
      data.workingTime = time;
    },
    getWorkingTime: function () {
      return data.workingTime;
    },
    toMS: function (time) {
      let timeArray = time.split(":");
      let hours = timeArray[0];
      let minutes = timeArray[1];
      if (hours.length > 2 && hours[0] === "-") {
        return hours * 60 * 60 * 1000 + minutes * 60 * 1000 * -1;
      } else {
        return hours * 60 * 60 * 1000 + minutes * 60 * 1000;
      }
    },
    toHours: function (time) {
      let hours = parseInt(time / 1000 / 60 / 60);
      let minutes = parseInt((time / 1000 / 60) % 60);

      if (Math.abs(hours) < 10) {
        if (hours < 0 || minutes < 0) {
          hours = "-0" + Math.abs(hours).toString();
        } else {
          hours = "0" + hours;
        }
      }
      return Math.abs(minutes) < 10
        ? hours.toString() + ":" + "0" + Math.abs(minutes)
        : hours.toString() + ":" + Math.abs(minutes);
    },
    printData: function () {
      let printOut;
      //get locale of browser
      const lang = navigator.language;
      //options for timeFormator
      const options = {
        //timeStyle: 'short',
        hour: "2-digit",
        minute: "2-digit",
      };
      //formator for hours
      const timeFormator = new Intl.DateTimeFormat(lang, options);
      const myData = data.logs.sort(function (a, b) {
        return b.date - a.date;
      });
      if (debugging) {
        console.log("All logs:");
        console.log(myData);
        window.myData = myData;
      }
      //format secondary headings in table
      // input is date with the first day of the month
      const formatHeading = (date) => {
        var string = new Intl.DateTimeFormat(navigator.language, {
          year: "numeric",
          month: "long",
        }).format(date);
        return string[0].toUpperCase() + string.substring(1);
      };
      //format days in human readable manner
      const dayFormator = (date) => {
        const now = new Date();
        const daysPassed = Math.floor((now - date) / 1000 / 60 / 60 / 24);
        if (daysPassed < 1) return `Tänään`;
        else if (daysPassed === 1) return `Eilen`;
        else if (daysPassed < 5) {
          const weekday = new Intl.DateTimeFormat(lang, {
            weekday: "long",
          }).format(date);
          return weekday[0].toUpperCase() + weekday.substring(1);
        } else return UIController.formator.format(date);
      };

      printOut = [];
      if (myData && myData.length > 0) {
        var groups = myData.reduce(function (r, o) {
          //Check if month is two digit
          if (o.date.getMonth() > 8) {
            var m = `${o.date.getFullYear()}-${o.date.getMonth() + 1}-01`;
          } else {
            var m = `${o.date.getFullYear()}-0${o.date.getMonth() + 1}-01`;
          }
          r[m] ? r[m].data.push(o) : (r[m] = { month: new Date(m), data: [o] });
          return r;
        }, {});
        var myDataByMonth = Object.keys(groups).map(function (k) {
          return groups[k];
        }); //.sort((a,b) => b - a); //sort descending

        if (debugging) {
          console.log("My data by month:");
          console.log(myDataByMonth);
          window.myDataByMonth = myDataByMonth;
        }
        for (i in myDataByMonth) {
          const curMonth = {
            month: formatHeading(new Date(myDataByMonth[i].month)),
            days: [],
          };
          printOut.push(curMonth);
          for (a in myDataByMonth[i].data) {
            let dailyInDate,
              dailyIn,
              dailyOutDate,
              dailyOut,
              printLine,
              workingDay;
            dailyIn =
              myDataByMonth[i].data[a].in.length > 0
                ? myDataByMonth[i].data[a].in.sort((a, b) => a.log - b.log)
                : [];
            dailyInDate = dailyIn.length > 0 ? new Date(dailyIn[0].log) : -1;
            dailyOut =
              myDataByMonth[i].data[a].out.length > 0
                ? myDataByMonth[i].data[a].out.sort((a, b) => b.log - a.log)
                : [];
            dailyOutDate = dailyOut.length > 0 ? new Date(dailyOut[0].log) : -1;
            workingDay =
              dailyOutDate > 0 && dailyInDate > 0
                ? dailyOutDate - dailyInDate
                : "---";
            printLine = [
              //formator.format(myDataByMonth[i].data[a].date),
              dayFormator(myDataByMonth[i].data[a].date),
              dailyInDate > 0 ? timeFormator.format(dailyInDate) : "---",
              dailyOutDate > 0 ? timeFormator.format(dailyOutDate) : "---",
              !isNaN(workingDay)
                ? this.toHours(workingDay).replace(":", ".")
                : "---", //työpäivän pituus
              this.toHours(myDataByMonth[i].data[a].saldo).replace(":", "."),
              myDataByMonth[i].data[a].ownSaldo
                ? this.toHours(myDataByMonth[i].data[a].ownSaldo).replace(
                    ":",
                    "."
                  )
                : "---",
            ];
            curMonth.days.push(printLine);
          }
        }

        if (debugging) {
          console.log("print out:");
          console.log(printOut);
        }
        return printOut;
      }
    },
    shareData: function () {
      //get locale of browser
      const lang = navigator.language;
      //options for timeFormator
      const options = {
        //timeStyle: 'short',
        hour: "2-digit",
        minute: "2-digit",
      };
      //formator for hours
      const timeFormator = new Intl.DateTimeFormat(lang, options);
      const printOut = [];
      const myData = data.logs.sort(function (a, b) {
        return b.date - a.date;
      });

      if (debugging) {
        console.log("Data: ");
        console.log(myData);
        window.myData = myData;
      }
      for (let i = 0; i < myData.length; i++) {
        let dailyInDate, dailyIn, dailyOutDate, dailyOut, printLine, workingDay;
        dailyIn =
          myData[i].in.length > 0
            ? myData[i].in.sort(function (a, b) {
                return a.log - b.log;
              })
            : [];
        dailyInDate = dailyIn.length > 0 ? new Date(dailyIn[0].log) : -1;
        dailyOut =
          myData[i].out.length > 0
            ? myData[i].out.sort(function (a, b) {
                return b.log - a.log;
              })
            : [];
        dailyOutDate = dailyOut.length > 0 ? new Date(dailyOut[0].log) : -1;
        workingDay =
          dailyOutDate > 0 && dailyInDate > 0
            ? dailyOutDate - dailyInDate
            : "---";
        printLine = [
          "<tr>",
          `<td>${UIController.formator.format(myData[i].date)}</td>`,
          `<td>${
            dailyInDate > 0 ? timeFormator.format(dailyInDate) : "---"
          }</td>`,
          `<td>${
            dailyOutDate > 0 ? timeFormator.format(dailyOutDate) : "---"
          }</td>`,
          `<td>${!isNaN(workingDay) ? this.toHours(workingDay) : "---"}</td>`, //työpäivän pituus
          `<td>${this.toHours(myData[i].saldo)}</td>`,
          `<td>${
            myData[i].ownSaldo ? this.toHours(myData[i].ownSaldo) : "---"
          }</td>`,
          "</tr>",
        ];
        printOut.push(printLine);
      }
      return printOut;
    },
    applySettings: function (workingTime, startingSaldo, name) {
      data.workingTime = this.toMS(workingTime);
      data.startingSaldo = this.toMS(startingSaldo);
      data.name = name;
      this.storeData();
    },
    testing: function () {
      if (debugging) {
        console.log(data);
      }
      return;
    },
    importData: async function (input) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = reader.result;
        let newData;
        //check if it is correct json
        try {
          newData = JSON.parse(contents);
        } catch (e) {
          const button = UIController.importButton;
          UIController.hideConfirmationModal();
          UIController.issueWarning("Vääränlainen tiedosto", button);
          return;
        }
        if (debugging) {
          console.log("New data to import:");
          console.log(newData);
        }

        //check if new data is integer)
        if (
          newData &&
          newData.logs &&
          newData.workingTime &&
          newData.mostRecent &&
          newData.logs.length > 0
        ) {
          // 1. Save new data
          localStorage.setItem("data", JSON.stringify(newData));
          // 2. load new data into app
          AppController.updateData(newData);
          // 3. update interface
          UIController.hideConfirmationModal();
          UIController.hideModal();
          UIController.status();
          UIController.formatLogData(AppController.printData());
        } else {
          const button = UIController.importButton;
          UIController.issueWarning("Vääränlainen tiedosto", button);
          UIController.hideConfirmationModal();
          return false;
        }
      };
      reader.readAsText(input);
    },
    getEditableLogs: function (filter) {
      return data.logs.filter(
        (obj) => obj.date.toDateString() === filter.toDateString()
      );
    },
    editLogs: function (logsToBeRemoved) {
      for (item of logsToBeRemoved) {
        const poistettava = parseInt(item.value);
        if (debugging) console.log(item);

        const newlogs = [];
        data.logs.forEach((obj) => {
          obj.in = obj.in.filter((el) => el.log.getTime() !== poistettava);
          obj.out = obj.out.filter((el) => el.log.getTime() !== poistettava);
          newlogs.push(obj);
        });
        if (debugging) {
          console.log("There are as many logged days as before:");
          console.log(data.logs.length === newlogs.length);
        }
      }
    },
    version: 20250805,
  };
})();

let UIController = (function () {
  let nodelistForEach = function (list, callback) {
    for (var i = 0; i < list.length; i++) {
      callback(list[i], i);
    }
  };
  let DOMStrings = {
    inputField: ".tyoaika",
    buttonIn: "#sis",
    buttonOAOUT: "#OAU",
    buttonOut: "#ulos",
    buttonSubmit: "#settings-submit",
    buttonSaveCorrection: "#save_correction",
    modal: "#modal-settings",
    modalButton: "#open-settings",
    modalClose: ".close",
    confirmationModal: "#modal-confirm",
    confirmationModalCancelButton: "#cancelbtn",
    confirmationModalApproveButton: "#confirmbtn",
    status: "status",
    logTable: ".history-table",
    logTableSubHeading: ".history-sub-caption",
    workingTimeInput: "#working-time-input",
    workingTimePercent: "#working-time-percent",
    workingTimeSaldoType: ".saldo__type",
    workingTimeSaldo: "#starting-saldo",
    settingsSubmit: "#settings-submit",
    historyTable: ".history",
    shareButton: ".share-button",
    settingName: ".name",
    correctionDate: "#correction-date",
    correctionTime: "#correction-time",
    correctionIn: "#radio-sis",
    correctionOut: "#radio-ul",
    correctionOAS: "#radio-oas",
    correctionShow: "#show-correction",
    correctionDIV: ".logging-correction",
    editionDIV: ".logging-edition",
    editionButtonDIV: ".logging-edition-button",
    editionShow: "#show-edition",
    editionDate: "#edition-date",
    editionTable: "#logging-edition-table",
    editionTableInput: ".edition-table-input",
    editionSubmit: "#logging-edition-submit",
    editionHeading: "#edition-heading",
    abortEdition: "#abort-edition",
    importInput: "#import-data-file",
    importButton: "#import-data-submit",
  };
  let saveSettings = function () {
    //save changes to working time
    const workingTime = document.querySelector(
      DOMStrings.workingTimeInput
    ).value;
    let startingSaldo = document.querySelector(
      DOMStrings.workingTimeSaldoType
    ).value;
    const startingSaldoNumber = document.querySelector(
      DOMStrings.workingTimeSaldo
    ).value;
    startingSaldo += startingSaldoNumber ? startingSaldoNumber : "00:00";
    //save name
    let myName = document.querySelector(DOMStrings.settingName).value;
    AppController.applySettings(workingTime, startingSaldo, myName);
  };
  let reset = function () {
    document.querySelector(DOMStrings.workingTimeInput).value = "07:15";
    document.querySelector(DOMStrings.workingTimePercent).value = 100;
  };
  const cleanUpModal = function () {
    document.querySelector(DOMStrings.correctionShow).style.display = "block";
    document.querySelector(DOMStrings.correctionDIV).style.display = "none";
    //remove all warning classes
    document.querySelectorAll(".warning").forEach((el) => el.remove());
    document.querySelector(DOMStrings.importInput).value = "";
    document.querySelector(DOMStrings.importInput).classList.remove("success");
    document.querySelector(DOMStrings.editionButtonDIV).style.display = "block";
    document.querySelector(DOMStrings.editionDIV).style.display = "none";
  };

  //error function for webshare function
  function logText(message, isError) {
    if (isError) console.error(message);
    else console.log(message);
  }

  function logError(message) {
    logText(message, true);
  }

  const saveCorrection = function () {
    //Get needed input fields
    const date = document.querySelector(DOMStrings.correctionDate).value;
    const time = document.querySelector(DOMStrings.correctionTime).value;
    const in_correction = document.querySelector(DOMStrings.correctionIn);
    const out_correction = document.querySelector(DOMStrings.correctionOut);
    const OAS_correction = document.querySelector(DOMStrings.correctionOAS);
    const type = function () {
      if (in_correction.checked) {
        return in_correction.value;
      } else if (out_correction.checked) {
        return out_correction.value;
      } else if (OAS_correction.checked) {
        return OAS_correction.value;
      }
    };

    //call function from the App-module with inputs as arguments
    if (date || time || type()) {
      AppController.processCorrection(date, time, type());
      if (date && time && (in_correction || out_correction || OAS_correction)) {
        return true;
      }
    } else return false;
  };

  const showEditionTableDiv = (dateDate) => {
    document.querySelector(DOMStrings.editionButtonDIV).style.display = "none";
    document.querySelector(DOMStrings.editionDIV).style.display = "block";
    document.querySelector(
      DOMStrings.editionHeading
    ).innerHTML = `Valitse poistettavat leimaukset päivälle ${UIController.formator.format(
      dateDate
    )}`;
  };

  const showEditionTableLogs = (logsToBeShown) => {
    //Make array from all loggings of the day to sort them:
    //copy with conversion to json to get a deep copy in order not to change the original data yet:
    const logsJson = JSON.stringify(logsToBeShown);
    const logsToShow = JSON.parse(logsJson);
    let loggings = [];
    logsToShow[0].in.forEach((el) => {
      el.type = "SISÄÄN";
      el.log = new Date(el.log);
      loggings.push(el);
    });
    logsToShow[0].out.forEach((el) => {
      el.type = el.type === "OAS" ? "Oma asia ulos" : "ULOS";
      el.log = new Date(el.log);
      loggings.push(el);
    });
    loggings.sort((el, next) => el.log.getTime() - next.log.getTime());
    if (debugging) {
      console.log("Sorted loggings:");
      console.log(loggings);
    }
    //Add the loggings to the table, if there are any
    const table = document.querySelector(DOMStrings.editionTable);

    let tableHTML = `<tr><th>Valitse</th><th>Päivä</th><th>Aika</th><th>Toiminto</th></tr>`;
    loggings.forEach((el, index) => {
      const date = new Date(el.log);
      const row = `<tr><td><input id="edit_${index}" class="edition-table-input" value="${date.getTime()}" type="checkbox" /></td><td>${UIController.formator.format(
        date
      )}</td><td>${timeFormator.format(date)}</td><td>${el.type}</td></tr>`;
      tableHTML += row;
    });

    table.innerHTML = tableHTML;
    return true;
  };

  const getSelectedLoggings = () => {
    //get table input fields
    const tableInputs = document.querySelectorAll(DOMStrings.editionTableInput);
    return [...tableInputs].filter((el) => el.checked);
  };

  const modalConfirmation = (inputFile) => {
    const cancel = document.querySelector(
      DOMStrings.confirmationModalCancelButton
    );
    const confirmation = document.querySelector(
      DOMStrings.confirmationModalApproveButton
    );
    document.querySelector(DOMStrings.confirmationModal).style.display =
      "block";
    cancel.onclick = () => {
      console.log("Was canceled");
      document.querySelector(DOMStrings.confirmationModal).style.display =
        "none";
    };
    confirmation.onclick = () => {
      console.log("Accepted");
      AppController.importData(inputFile);
    };
  };

  const subModalClose = () => {
    document.querySelector(DOMStrings.editionButtonDIV).style.display = "block";
    document.querySelector(DOMStrings.editionDIV).style.display = "none";
    return false;
  };

  //const options = ;
  const timeFormator = new Intl.DateTimeFormat(navigator.language, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    getDOMStrings: function () {
      return DOMStrings;
    },
    formator: new Intl.DateTimeFormat(navigator.language),
    regLogging: function (type, addition) {
      // addition at the moment only 'OAS'
      AppController.addLogging(type, addition);
      //here we can calculate saldo
      if (type === "ULOS") {
        AppController.calcSaldo();
      }
      AppController.storeData();
    },
    //Shows if the user is IN or OUT
    status: function () {
      let el, text;
      el = document.getElementById(DOMStrings.status);
      if (AppController.mostRecentLogging().type === "SISÄÄN") {
        text = "Olet kirjautunut sisään.";
        // Show saldo now
        const saldoNow = AppController.calcSaldoNow();
        text += `\n(Jos lähtisit nyt, saldosi olisi ${saldoNow})`;
      } else if (AppController.mostRecentLogging().type === "ULOS") {
        text = "Olet kirjautunut ulos.";
      } else {
        text = "";
      }
      const saldosi = "\nSaldosi on " + AppController.getSaldo();
      const versio = `\nVersio: ${AppController.version}`;
      if (debugging) {
        el.innerText = text + saldosi + versio;
      } else {
        el.innerText = text + saldosi;
      }
    },
    updateSettings: function () {
      //get time from DOM
      //Update time to Data
      //saveSettings();
    },
    updateTime: function () {
      let percent = document.querySelector(DOMStrings.workingTimePercent).value;
      let time = document.querySelector(DOMStrings.workingTimeInput);
      time.value = AppController.toHours(
        (AppController.toMS("7:15") * percent) / 100
      );
    },
    updatePercent: function () {
      let percent = document.querySelector(DOMStrings.workingTimePercent);
      let time = document.querySelector(DOMStrings.workingTimeInput).value;
      percent.value = Math.round(
        (AppController.toMS(time) / AppController.toMS("7:15")) * 100
      );
    },
    wrongWorkingTimeAlert: function () {
      if (AppController.getWorkingTime() > 26100000) {
        alert(
          "Päivitä työaikasi! Uusi päivittäinen täysi työaika on 7:15. Työajan voit vaihtaa asetuksissa."
        );
      }
    },
    formatLogData: function (tableData) {
      //prepare table in document
      if (tableData) {
        const table = document.querySelector(DOMStrings.logTable);
        const tableRows = document.querySelectorAll("td");
        if (tableRows && tableRows.length > 0)
          nodelistForEach(tableRows, function (el) {
            return el.parentNode.remove();
          });
        const tableSubHeadings = table.querySelectorAll(
          DOMStrings.logTableSubHeading
        );
        if (tableSubHeadings && tableSubHeadings.length > 0)
          nodelistForEach(tableSubHeadings, function (el) {
            return el.parentNode.remove();
          });
        //Fill table
        for (i in tableData) {
          //Generate monthly headings
          const headingRow = document.createElement("TR");
          const heading = document.createElement("TH");
          heading.setAttribute("colspan", 6);
          heading.classList.add("history-sub-caption");
          const headingCell = document.createTextNode(tableData[i].month);
          heading.appendChild(headingCell);
          headingRow.appendChild(heading);
          table.children[0].appendChild(headingRow);
          //Generate daily data
          const array = tableData[i].days;
          array.forEach((el) => {
            let rows = document.createElement("TR");
            el.forEach((innerEl) => {
              let row = document.createElement("TD");
              let cell = document.createTextNode(innerEl);
              row.appendChild(cell);
              rows.appendChild(row);
            });
            table.children[0].appendChild(rows);
          });
        }
        table.classList.remove("hidden");
      }
    },

    webShare: function () {
      const userName = `${AppController.getName()}

      `;
      const text_input = AppController.shareData();
      const tableTitle =
        "<tr><th>Päivä</th> <th>Sisään</th> <th>Ulos</th> <th>Työpäivä</th> <th>Saldo</th> <th>Oma aika</th></tr>\n";
      let table = "<table>" + tableTitle;
      table += text_input.join("\n").replace(/,/g, "");
      table += "</table>";
      if (debugging) {
        console.log("The html table of data:");
        console.log(table);
      }
      const htmlHead = `<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="utf-8">
      <style>
      body {
        font-family: sans-serif;
      }
      table {
        border-collapse: collapse;
      }
      th, td {
        padding: 8px;
        border: 1px solid #ddd;
      }
      tr:nth-child(even) {
        background-color: #f2f2f2;
      }
      tr:hover {
        background-color: #ddd;
      }
      th {
        padding-top: 12px;
        padding-bottom: 12px;
        text-align: left;
        background-color: #e67300;
        color: white;
      }
      </style>
      </head>
      <body>`;
      const htmlEnd = `</body></html>`;
      const title = "Työajanseuranta";
      const text =
        htmlHead +
        `<p>${title}: ${userName}</p><p>Oma saldo: ${AppController.getSaldo()}</p>` +
        table +
        htmlEnd;

      const blob = new Blob([text], {
        type: "text/html",
      });
      const url = URL.createObjectURL(blob);
      return url;
    },
    webShareButton: function () {
      const shareDiv = document.querySelector(DOMStrings.shareButton);
      UIController.downloadLink(
        shareDiv,
        UIController.webShare(),
        "OmatKirjaukset.html"
      );
    },
    importButton: document.querySelector(DOMStrings.importButton),
    setModal: function () {
      // Get the modal
      let modal = document.querySelector(DOMStrings.modal);

      //Confirmation modal
      const confirmationModal = document.querySelector(
        DOMStrings.confirmationModal
      );

      // Get the button that opens the modal
      let btn = document.querySelector(DOMStrings.modalButton);

      // Get the <span> element that closes the modals
      let span = document.querySelectorAll(DOMStrings.modalClose)[0];
      const confirmationSpan = document.querySelectorAll(
        DOMStrings.modalClose
      )[1];

      // Get Tallenna button
      let close = document.querySelector(DOMStrings.buttonSubmit);

      // Get the div for logging corrections
      const loggingCorrectionDIV = document.querySelector(
        DOMStrings.correctionDIV
      );

      //Logging correction save button
      const correctionButton = document.querySelector(
        DOMStrings.buttonSaveCorrection
      );

      //Loggin correction show button
      const correctionShowButton = document.querySelector(
        DOMStrings.correctionShow
      );

      // When the user clicks on the button, open the modal
      btn.onclick = function () {
        cleanUpModal();
        modal.style.display = "block";
        AppController.updateStartingSaldo();
        AppController.updateWorkingTimePercent();
        AppController.updateName();
      };

      // When the user clicks on <span> (x), close the modal
      span.onclick = function () {
        modal.style.display = "none";
        reset();
        cleanUpModal();
      };

      // close confirmation modal
      confirmationSpan.onclick = () => {
        confirmationModal.style.display = "none";
      };

      // When the user clicks anywhere outside of the modal, close it
      window.onclick = function (event) {
        if (event.target == modal) {
          modal.style.display = "none";
          cleanUpModal();
        }
        if (event.target == confirmationModal) {
          confirmationModal.style.display = "none";
        }
      };
      //Close modal also with the Tallenna button
      close.onclick = function () {
        saveSettings();
        AppController.storeData();
        UIController.status();
        modal.style.display = "none";
        cleanUpModal();
        return false; //prevents page from reloading
      };

      //Show the logging changing part
      if (correctionShowButton) {
        correctionShowButton.onclick = function () {
          correctionShowButton.style.display = "none";
          loggingCorrectionDIV.style.display = "block";
        };
      }

      //Save changed logging and close modal
      correctionButton.onclick = function () {
        const correction = saveCorrection();
        if (correction) {
          modal.style.display = "none";
          cleanUpModal();
          UIController.status();
          UIController.formatLogData(AppController.printData());
          AppController.storeData();
        } else {
          UIController.issueWarning("Täytä kaikki kentät!", correctionButton);
        }
        return false;
      };

      //Logging edition function in modal
      const editionShowButton = document.querySelector(DOMStrings.editionShow);

      if (editionShowButton) {
        editionShowButton.onclick = function () {
          const date = document.querySelector(DOMStrings.editionDate).value;
          if (debugging) {
            console.log(date);
          }

          if (date && date.length > 0) {
            //format the chosen date as Date
            const dateDate = new Date(date);
            //Filter logs for chosen date:
            const loggingsObj = AppController.getEditableLogs(dateDate);

            if (loggingsObj.length > 0) {
              //show the table
              showEditionTableDiv(dateDate);
              showEditionTableLogs(loggingsObj);
            } else {
              cleanUpModal();
              UIController.issueWarning(
                "Ei kirjauksia tälle päivälle.",
                editionShowButton
              );
            }

            //Check if one is selected, when submit button pressed
            const submitButton = document.querySelector(
              DOMStrings.editionSubmit
            );
            submitButton.addEventListener("click", function () {
              const onlyChecked = getSelectedLoggings();
              if (debugging) {
                console.log("Checked entries:");
                console.log(onlyChecked);
              }
              if (onlyChecked.length > 0) {
                AppController.editLogs(onlyChecked);
                //update saldo:
                const realDate = new Date(parseInt(onlyChecked[0].value));
                console.log(realDate);
                AppController.calcDailySaldo(realDate);
                //save new loggings to data
                AppController.storeData();
                //close modal
                modal.style.display = "none";
                reset();
                cleanUpModal();
              } else {
                cleanUpModal();
                UIController.issueWarning(
                  "Valitse vähintään yksi poistettava rivi",
                  editionShowButton
                );
              }
              //call also refresh of time table drawing
              UIController.status();
              UIController.formatLogData(AppController.printData());
              return false;
            });
            //sulje painamalla sulje-nappi
            const button = document.querySelector(DOMStrings.abortEdition);
            button.addEventListener("click", subModalClose);
          } else {
            cleanUpModal();
            UIController.issueWarning(
              "Täytä kaikki kentät!",
              editionShowButton
            );
          }
          return false;
        };
      }
    },
    downloadLink: function (element, fileUrl, fileName) {
      const a = document.createElement("a");
      a.target = "blank";
      a.href = fileUrl;
      a.download = fileName;
      element.insertAdjacentElement("afterend", a);
      a.click();
      a.remove();
      UIController.hideModal();
    },
    dowloadButton: function () {
      const downloadDiv = document.querySelector("#download-data-link");
      UIController.downloadLink(
        downloadDiv,
        UIController.downloadData(),
        "Kirjaukset.json"
      );
      console.log("Data has been downloaded");
    },
    downloadData: function () {
      const ownData = JSON.stringify(AppController.getStoredData());
      const blob = new Blob([ownData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      return url;
    },
    hideModal: function () {
      const modal = document.querySelector(DOMStrings.modal);
      modal.style.display = "none";
    },
    hideConfirmationModal: function () {
      const modal = document.querySelector(DOMStrings.confirmationModal);
      modal.style.display = "none";
    },
    issueWarning: function (text, element) {
      const p = document.createElement("P");
      p.classList.add("warning");
      p.innerText = text;
      element.parentNode.appendChild(p);
    },
    inputVerification: function () {
      const input = document.querySelector(DOMStrings.importInput);
      input.addEventListener("input", function () {
        if (input.value.length > 0) {
          document.querySelectorAll(".warning").forEach((el) => el.remove());
          input.classList.add("success");
        } else {
          input.classList.remove("success");
        }
      });
    },
    prepareImport: function () {
      const button = document.querySelector(DOMStrings.importButton);
      const inputFile = document.querySelector(DOMStrings.importInput).files[0];
      //clean up, if file selected:
      if (!inputFile) {
        UIController.issueWarning("Valitse tiedosto!", button);
        return false;
      }
      modalConfirmation(inputFile);
    },
  };
})();

//Main app
let Controller = (function (AppController, UIController) {
  let setupEventListeners = function () {
    //call the function from UIController
    var DOM = UIController.getDOMStrings();

    //Click for adding an item
    document.querySelector(DOM.buttonIn).addEventListener("click", ctrAddIn); //callback function, does not have to be called here directly

    document.querySelector(DOM.buttonOut).addEventListener("click", ctrAddOut);

    document
      .querySelector(DOM.buttonOAOUT)
      .addEventListener("click", ctrAddOwnOut);

    //click for saving settings
    document
      .querySelector(DOM.settingsSubmit)
      .addEventListener("click", UIController.updateSettings);

    document
      .querySelector(DOM.workingTimePercent)
      .addEventListener("blur", UIController.updateTime);
    document
      .querySelector(DOM.workingTimePercent)
      .addEventListener("click", UIController.updateTime);

    document
      .querySelector(DOM.workingTimeInput)
      .addEventListener("blur", UIController.updatePercent);

    //Share button
    const shareButton = document.querySelector(DOM.shareButton);
    shareButton.addEventListener("click", UIController.webShareButton);

    //Download link
    const downloadDiv = document.querySelector("#download-data-link");
    downloadDiv.addEventListener("click", UIController.dowloadButton);

    //ImportButton
    const button = document.querySelector(DOM.importButton);
    button.addEventListener("click", UIController.prepareImport);
    UIController.inputVerification();
  };

  let ctrAddIn = function () {
    //call function from UIController
    UIController.regLogging("SISÄÄN");
    UIController.status();
    UIController.formatLogData(AppController.printData());
  };

  let ctrAddOut = function () {
    //call function from UIController
    UIController.regLogging("ULOS");
    UIController.status();
    UIController.formatLogData(AppController.printData());
  };
  let ctrAddOwnOut = function () {
    UIController.regLogging("ULOS", "OAS");
    UIController.status();
    UIController.formatLogData(AppController.printData());
  };
  let setNow = function () {
    AppController.setTime();
  };

  function regSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/Tyo-aikaApp/sw.js")
        .then(function (reg) {
          if (reg.installing) {
            console.log("Service worker installing");
          } else if (reg.waiting) {
            console.log("Service worker installed");
          } else if (reg.active) {
            console.log("Service worker active");
          }
        })
        .catch(function (err) {
          console.info("Service workers are not supported. " + err);
        });
    }
  }

  var loadData = function () {
    // 1. Load data from local storage
    var storedData = AppController.getStoredData();

    if (storedData) {
      // 2. insert the saved data into local storage
      AppController.updateData(storedData);
      // 3. update status line
      UIController.status();
    }
  };

  let autoLogOut = function () {
    //TODO: log out after 20:15
  };

  return {
    init: function () {
      console.log("Application has started.");
      UIController.setModal();
      //setInterval(setNow(), 1000);

      //Show the time
      document.getElementById("tyoaika").innerText =
        new Date().toLocaleTimeString();
      // Update time every second
      setInterval(function () {
        document.getElementById("tyoaika").innerText =
          new Date().toLocaleTimeString();
      }, 1000);
      // Update saldo/status every minute
      setInterval(function () {
        UIController.status();
      }, 60000);

      loadData();
      setupEventListeners();
      UIController.formatLogData(AppController.printData());
      UIController.wrongWorkingTimeAlert();
      regSW();
    },
  };
})(AppController, UIController);

Controller.init();
