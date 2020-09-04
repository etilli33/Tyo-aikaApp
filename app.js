// Check if site's storage has been marked as persistent
/*
if (navigator.storage && navigator.storage.persist) {
  const isPersisted = await navigator.storage.persisted();
  console.log(`Persisted storage granted: ${isPersisted}`);
}
*/


let AppController = (function() {
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
      ],//array with objects with properties day (yyyy/dd/mm), out and in arrays + dailySaldo saved
    mostRecent: {
      type: '',
      time: 0
    },
    workingTime: 26100000, //26460000,
    saldo: 0,
    startingSaldo: 0,
    dailySaldo: [], //array of objects with date and saldo pairs
    name: ''
  };

  let calcDayString = function(now) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };
  let countOwnOutSaldo = function(obj) {
    let outTimeArray = [0];
    if (obj.out.find(el => el.type)) {
    let inArray = obj.in.map(el => el.log);
    console.log(inArray);
    let outArray = obj.out.filter(el => el.type === 'OAS').map(el => el.log);
    console.log(outArray);
    //find next bigger entry from out in the in-array, then do in-entry - out-entry

    for (let i = 0; i < outArray.length; i++) {
      let nextIn = inArray.find(el => el > outArray[i]);
      //nextIn can be undefined, if user has not yet come back from OwnOut
      if (nextIn) {
      outTimeArray.push(nextIn - outArray[i]);
        }
      }
    return outTimeArray;
    }
  };

  return {
  // Setting data into local storage
     storeData: function () {
       if (typeof(Storage) !== 'undefined') {
       localStorage.setItem("data", JSON.stringify(data));
     }
     },

     // Getting data from local storage
     getStoredData: function () {
       if (typeof(Storage) !== 'undefined') {
       var localData = JSON.parse(localStorage.getItem('data'));
       //make backup
       localStorage.setItem('backup', JSON.stringify(localData));
       return localData;
     } // else do nothing
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
     updateStartingSaldo: function() {
       const DOM = UIController.getDOMStrings();
       data.startingSaldo > 0 ? document.querySelector(DOM.workingTimeSaldoType).value = '+' : document.querySelector(DOM.workingTimeSaldoType).value = '-';
       document.querySelector(DOM.workingTimeSaldo).value = this.toHours(Math.abs(data.startingSaldo));
       this.calcSaldo();
     },
     updateWorkingTimePercent: function() {
       const DOM = UIController.getDOMStrings();
       document.querySelector(DOM.workingTimeInput).value = this.toHours(data.workingTime);
       UIController.updatePercent();
     },
     updateName: function() {
       const DOM = UIController.getDOMStrings();
       document.querySelector(DOM.settingName).value = data.name;
    },
    getName: function() {
      if (data.name && data.name.length > 0) {
        return data.name.trim();
      } else {
        return '';
      }
    },
     getTime: function() {
       //adds zeros to the output, if needed
       function checkTime(i) {
         return (i < 10) ? "0" + i : i;
       }
       let now, hour, minutes;
       now = new  Date();
       hour = now.getHours();
       minutes = now.getMinutes();
       return hour + ':' + minutes;
     },
     addLogging: function(type,addition) {
       let now, dayString, item, nowObj;
       now = new Date();
       //new Data structure
       //get today-string
       dayString = calcDayString(now);
         // if day is not there  create it
         if (!data.logs.some(el => el.date) || !data.logs.some(el => el.date.getTime() === dayString.getTime())) {
          let dayObject = {};
          dayObject.date = dayString;
          dayObject.in = [];
          dayObject.out = [];
          dayObject.saldo = 0;
          data.logs.push(dayObject)
       }
       item = data.logs[data.logs.findIndex(el => el.date.getTime() === dayString.getTime())];

       if (addition) {
       nowObj = {log: now, type: addition};
     } else {
        nowObj = {log: now};
     }
       if (type === 'SISÄÄN' && data.mostRecent.type !== 'SISÄÄN') {
         item.in.push(nowObj);
         data.mostRecent.type = type;
         data.mostRecent.time = now;
         console.log('New SISÄÄN registered.');
       } else if (type === 'ULOS' && data.mostRecent.type !== 'ULOS') {
         item.out.push(nowObj);
         data.mostRecent.type = type;
         data.mostRecent.time = now;
         console.log('New ULOS registered.');
       }
     },
     saveLoggingType: function(string) {

     },
     mostRecentLogging: function() {
       return data.mostRecent;
     },
     mostRecentDay: function(index) {
       let sorted = data.logs.sort((a,b) => b.date - a.date);
       return sorted[index];

     },
     mostRecentOut: function() {
       //check first with mostRecentDay, in which object you have to start calculating
       let obj = this.mostRecentDay(0);
       let mostRecentOut;//Saves date in MS
       for (let i = 0; i < obj.out.length; i++ )
       {  (mostRecentOut > obj.out[i].log) ? mostRecentOut : mostRecentOut = obj.out[i].log }
       return mostRecentOut;
     },
     calcSaldo: function() {//should be called only after logout
       let obj, mostRecentOut, firstLoginToday, workingDay, ownSaldo, ownSaldoArray, totalSaldo, saldoToday;
       obj = this.mostRecentDay(0);
       if (obj && obj.in.length > 0 && obj.in) {
       //get most recent logout.
       mostRecentOut = this.mostRecentOut();

       //calculate smallest amount, i.e. the first event in that array
       firstLoginToday  = obj.in.sort(function(a,b){return a.log - b.log})[0].log;

       // calculate difference
       workingDay = mostRecentOut - firstLoginToday;
       //console.log(this.toHours(workingDay));

       //take into account also login and logouts in between and their reasons
       ownSaldoArray = countOwnOutSaldo(obj);
       //console.log(ownSaldoArray);
       //Prepare own saldo, so it is not undefined
       ownSaldo = 0;
       const arraySum = arr => arr.reduce((a,b) => a + b, 0);
       //calc only if own loggings have happened:
       if (ownSaldoArray) {
          ownSaldo = arraySum(ownSaldoArray);
          console.log(this.toHours(ownSaldo));
          //write it into memory
          data.logs[data.logs.findIndex(el => el.date.getTime() === obj.date.getTime())].ownSaldo = ownSaldo;
          //remove sum of ownOut from workingDay
          //workingDay = workingDay - ownSaldo;
          //
        }
       //compare to workingTime
       saldoToday = 0;
       if (workingDay || !isNaN(workingDay)) {
         saldoToday = (workingDay - data.workingTime) - ownSaldo;
       }
       //write saldoToday into memory
       data.logs[data.logs.findIndex(el => el.date.getTime() === obj.date.getTime())].saldo = saldoToday;
       //take old saldo and add/remove new saldo
       totalSaldo = 0;
       //totalSaldo should be sum of all daily saldos - startingSaldo
       for (i in data.logs) {
         totalSaldo += data.logs[i].saldo;
       }
       if (data.startingSaldo) {
       data.saldo = parseInt(totalSaldo);// + parseInt(data.startingSaldo);
     } else {
       data.saldo = parseInt(totalSaldo);
     }

       console.log("Koko Saldo: " + totalSaldo);
       console.log("Koko saldo miinus aloitussaldo: " + (totalSaldo + data.startingSaldo));

       /*
       //get second last day:
       if (data.logs.length > 1) {
       let yesterday = this.mostRecentDay(1)
       totalSaldo = saldoToday + yesterday.saldo;
     } else {totalSaldo = saldoToday;}
       data.saldo = totalSaldo;
       */
     }
     },
     getSaldo: function() {
       //let obj = this.mostRecentDay(0);
       //return this.toHours(obj.saldo);
       //take startingSaldo only here into account
       return this.toHours(data.saldo + data.startingSaldo);
     },
     setWorkingTime: function(time) {
       data.workingTime = time;
     },
     getWorkingTime: function() {
       return data.workingTime;
     },
     toMS: function(time) {
       let timeArray = time.split(':');
       let hours = timeArray[0];
       let minutes = timeArray[1];
       return (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
     },
     toHours: function(time) {
       let hours = parseInt(time / 1000 / 60 / 60);
       let minutes = parseInt(time / 1000 / 60 % 60);

       if (Math.abs(hours) < 10) {
         if (hours < 0 || minutes < 0) {
           hours = '-0' + Math.abs(hours).toString();
         } else {
          hours = '0' + hours;
         }
       }
         return (Math.abs(minutes) < 10) ? hours.toString() + ':' + '0' + Math.abs(minutes) : hours.toString() + ':' + Math.abs(minutes);
     },
     printData: function() {
       let myData, printOut;
       myData = data.logs.sort(function(a, b){return b.date - a.date});
       printOut = [];
       if (myData && myData.length > 0) {
       for (let i = 0; i < myData.length; i++) {
         let dailyInDate, dailyIn, dailyOutDate, dailyOut, printLine, workingDay;
         dailyIn = (myData[i].in.length > 0) ? myData[i].in.sort(function(a,b){return a.log -b.log}) : [];
         dailyInDate = (dailyIn.length > 0) ? new Date(dailyIn[0].log) : -1;
         dailyOut = (myData[i].out.length > 0) ? myData[i].out.sort(function(a,b){return b.log -a.log}) : []; //[myData[i].out.length -1].log
         dailyOutDate = (dailyOut.length > 0 ) ? new Date(dailyOut[0].log) : -1;
         workingDay = (dailyOutDate > 0 && dailyInDate > 0) ? dailyOutDate - dailyInDate : '---';
         printLine = [
           `${myData[i].date.getDate()}.${myData[i].date.getMonth() + 1}.${myData[i].date.getFullYear()}`,
           (dailyInDate > 0) ? dailyInDate.toLocaleTimeString() : '---',
           (dailyOutDate > 0) ? dailyOutDate.toLocaleTimeString() : '---',
           (!isNaN(workingDay)) ? this.toHours(workingDay) : '---',//työpäivän pituus
           this.toHours(myData[i].saldo),
           (myData[i].ownSaldo) ? this.toHours(myData[i].ownSaldo) : '---'
            ];
         printOut.push(printLine);
       }
       return printOut;
      }
     },
     applySettings: function(workingTime, startingSaldo, name) {
       data.workingTime = this.toMS(workingTime);
       data.startingSaldo = this.toMS(startingSaldo);
       data.name = name;
       this.storeData();
     },
     testing: function() {
       console.log(data);
     }
  }
})();




let UIController = (function() {

   let nodelistForEach = function (list, callback) {
    for (var i = 0; i < list.length; i++) {
      callback(list[i], i);
    }
  };
  let DOMStrings = {
    inputField: '.tyoaika',
    buttonIn: '#sis',
    buttonOAOUT: '#OAU',
    buttonOut: '#ulos',
    buttonSubmit: '#settings-submit',
    modal: '#modal-settings',
    modalButton: '#open-settings',
    modalClose: 'close',
    status: 'status',
    logTable: '.history-caption',
    workingTimeInput: '#working-time-input',
    workingTimePercent: '#working-time-percent',
    workingTimeSaldoType: '.saldo__type',
    workingTimeSaldo: '#starting-saldo',
    settingsSubmit: '#settings-submit',
    historyTable: '.history',
    shareButton: '.share-button',
    settingName: '.name'
  };
  let saveSettings = function() {
    //save changes to working time
    let workingTime = document.querySelector(DOMStrings.workingTimeInput).value;
    let startingSaldo = document.querySelector(DOMStrings.workingTimeSaldoType).value;
    startingSaldo += document.querySelector(DOMStrings.workingTimeSaldo).value;
    //save name
    let myName = document.querySelector(DOMStrings.settingName).value;
    AppController.applySettings(workingTime,startingSaldo,myName);
  };
  let reset = function() {
    document.querySelector(DOMStrings.workingTimeInput).value = '07:15';
    document.querySelector(DOMStrings.workingTimePercent).value = 100;
  };

  //error function for webshare function
      function logText(message, isError) {
        if (isError)
          console.error(message);
        else
          console.log(message);
      }
  
      function logError(message) {
        logText(message, true);
      }
return {
    getDOMStrings: function() {
      return DOMStrings;
    },
    regLogging: function(type,addition) {// addition at the moment only 'OAS'
      AppController.addLogging(type,addition);
      //here we can calculate saldo
       if (type === 'ULOS') {
       AppController.calcSaldo();
      }
      AppController.storeData();
    },
    //Shows if the user is IN or OUT
    status: function() {
      let el, text;
      el = document.getElementById(DOMStrings.status);
      if (AppController.mostRecentLogging().type === 'SISÄÄN') {
        text = 'Olet kirjautunut sisään.';
      } else if (AppController.mostRecentLogging().type === 'ULOS') {
        text = 'Olet kirjautunut ulos.';
      } else {
        text = ''
      }

      el.innerText = text + '\nSaldosi on ' + AppController.getSaldo();
    },
    updateSettings: function() {
      //get time from DOM

      //Update time to Data
      //saveSettings();
    },
    updateTime: function() {
      let percent = document.querySelector(DOMStrings.workingTimePercent).value;
      let time = document.querySelector(DOMStrings.workingTimeInput);
      time.value = AppController.toHours((AppController.toMS('7:15') * percent) / 100);

    },
    updatePercent: function() {
      let percent = document.querySelector(DOMStrings.workingTimePercent);
      let time = document.querySelector(DOMStrings.workingTimeInput).value;
      percent.value = Math.round((AppController.toMS(time) / AppController.toMS('7:15')) * 100);
    },
    wrongWorkingTimeAlert: function() {
      if (AppController.getWorkingTime() > 26100000) {
        alert('Päivitä työaikasi! Uusi päivittäinen täysi työaika on 7:15. Työajan voit vaihtaa asetuksissa.');
      }
    },
    formatLogData: function(array) {
      //table.classList.add('hidden');
      if (array && array.length > 0) {
      let table = document.querySelector(DOMStrings.logTable);
      let table2 = document.querySelectorAll('td');
      nodelistForEach(table2, function(el) {return el.remove();})  ;

      array.forEach(el => {
          let rows = document.createElement('TR');
          el.forEach(innerEl => {
            let row = document.createElement('TD');
            let cell = document.createTextNode(innerEl);
            row.appendChild(cell);
            rows.appendChild(row);
          });
          table.appendChild(rows);
      });
      table.classList.remove('hidden');
      }
    },

    webShare: async function() {
      if (navigator.share === undefined) {
        logError('Error: Unsupported feature: navigator.share()');
        return;
      }
      const userName = `${AppController.getName()}

`;
      const text_input = AppController.printData().join('\n').replace(/,/g,'\t');
      const tableTitle = 'Päivä\t Sisään\t Ulos\t Työpäivä\t Saldo\t Oma aika\n';
      let table = tableTitle;
      table += text_input;
      const title = 'Työajanseuranta';
      const text = userName + table;
      const files = [new File([table], 'loggings.csv', {type : 'text/csv'})];
      //const text = text_input.disabled ? undefined : text_input.innerText;
      //const url = url_input.disabled ? undefined : url_input.value;
      //const files = file_input.disabled ? undefined : file_input.files;
      if (files && files.length > 0) {
        if (!navigator.canShare || !navigator.canShare({files})) {
          logError('Error: Unsupported feature: navigator.canShare()');
          return;
        }
      }
      try {
        await navigator.share({title: title, text: text, files: files});
        logText('Successfully sent share');
      } catch (error) {
        logError('Error sharing: ' + error);
      }
    },
    setModal: function() {
      // Get the modal
      let modal = document.querySelector(DOMStrings.modal);

      // Get the button that opens the modal
      let btn = document.querySelector(DOMStrings.modalButton);

      // Get the <span> element that closes the modal
      let span = document.getElementsByClassName(DOMStrings.modalClose)[0];

      // Get Tallenna button
      let close = document.querySelector(DOMStrings.buttonSubmit);

      // When the user clicks on the button, open the modal
      btn.onclick = function() {
        modal.style.display = "block";
        AppController.updateStartingSaldo();
        AppController.updateWorkingTimePercent();
        AppController.updateName();
      }

      // When the user clicks on <span> (x), close the modal
      span.onclick = function() {
        modal.style.display = "none";
        reset();
      }

      // When the user clicks anywhere outside of the modal, close it
      window.onclick = function(event) {
        if (event.target == modal) {
          modal.style.display = "none";
        }
      }
      //Close modal also with the Tallenna button
      close.onclick = function() {
        saveSettings();
        AppController.storeData();
        modal.style.display = 'none';

      }
    }
  }

})();


//Main app
let Controller = (function(AppController, UIController) {

  let setupEventListeners = function () {
    //call the function from UIController
    var DOM = UIController.getDOMStrings();

    //Click for adding an item
    document.querySelector(DOM.buttonIn).addEventListener('click',  ctrAddIn); //callback function, does not have to be called here directly

    document.querySelector(DOM.buttonOut).addEventListener('click', ctrAddOut);

    document.querySelector(DOM.buttonOAOUT).addEventListener('click', ctrAddOwnOut);


      //click for saving settings
      document.querySelector(DOM.settingsSubmit).addEventListener('click', UIController.updateSettings);

      document.querySelector(DOM.workingTimePercent).addEventListener('blur', UIController.updateTime);
      document.querySelector(DOM.workingTimePercent).addEventListener('click', UIController.updateTime);

      document.querySelector(DOM.workingTimeInput).addEventListener('blur', UIController.updatePercent);

      //Share button
      document.querySelector(DOM.shareButton).addEventListener('click', UIController.webShare);


      if (navigator.share === undefined) {
        if (window.location.protocol === 'http:') {
          // navigator.share() is only available in secure contexts.
          window.location.replace(window.location.href.replace(/^http:/, 'https:'));
        } else {
          logError('Error: You need to use a browser that supports this draft ' +
                   'proposal.');
          //hide button, if not supported
          document.querySelector(DOM.shareButton).classList.add('hidden');
        }
      }
    };

    //error function for webshare function
    function logText(message, isError) {
      if (isError)
        console.error(message);
      else
        console.log(message);
    }

    function logError(message) {
      logText(message, true);
    }

    let ctrAddIn = function() {
      //call function from UIController
      UIController.regLogging('SISÄÄN');
      UIController.status();
      UIController.formatLogData(AppController.printData());
    };

    let ctrAddOut = function() {
      //call function from UIController
      UIController.regLogging('ULOS');
      UIController.status();
      UIController.formatLogData(AppController.printData());
    };
    let ctrAddOwnOut = function() {
      UIController.regLogging('ULOS','OAS')
      UIController.status();
      UIController.formatLogData(AppController.printData());
    }
  let setNow = function () {
    AppController.setTime();
  };

  var loadData = function () {
    // 1. Loca data from local storage
    var storedData = AppController.getStoredData();

    if (storedData) {
      // 2. insert the saved data into local storage
      AppController.updateData(storedData);

      // 3. create log ins
      //storedData.in.forEach(function (cur) {
        //var newIncItem = budgetCtrl.addItem("inc", cur.description, cur.value);
        //UIController.addListItem(newIncItem, "inc");
      //});

      // 4. Creating  log outs
      //storedData.out.forEach(function (cur) {
        //var newExpItem = budgetCtrl.addItem("exp", cur.description, cur.value);
        //UIController.addListItem(newExpItem, "exp");
      //});


      // 5. Display the status
      //budget = budgetCtrl.getBudget();
      UIController.status();


    }
  };

  let autoLogOut = function() {
    //TODO: log out after 20:15

  };







  return {
    init: function() {
      console.log('Application has started.')
      UIController.setModal();
      //setInterval(setNow(), 1000);
      //Show the time
      document.getElementById('tyoaika').innerText = new Date().toLocaleTimeString();
      //update time every second
      setInterval(function() {

        document.getElementById('tyoaika').innerText = new Date().toLocaleTimeString();
      }, 1000);

      loadData();
      setupEventListeners();
      UIController.formatLogData(AppController.printData());
      UIController.wrongWorkingTimeAlert();
    }
  }

})(AppController, UIController);

Controller.init();
