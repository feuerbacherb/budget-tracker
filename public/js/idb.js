// create variable to hold db connection
let db;

// establish a connection to IndexedDB database called 'budget_tracker' and set it to version 1
const request = indexedDB.open('budget_tracker', 1);

// this event will emit if the database version changes (nonexistant to version 1, 2, etc)
request.onupgradeneeded = function(event) {
    // save a reference to the database
    const db = event.target.result;

    // create an object store(table) called 'pending', set it to have an auto incrementing primary key
    db.createObjectStore('pending', { autoIncrement: true });
};

request.onerror = function(event) {
    // log any errors here
    console.log(event.target.errorCode);
};

// this function will be executed if we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
    // open a new transaction with the database with read and write permission
    const transaction = db.transaction(['pending'], 'readwrite');

    // access the object store for the 'pending'
    const budgetObjectStore = transaction.objectStore('pending');

    // add record to the store with the add method
    budgetObjectStore.add(record);
}

function uploadPending() {
    // open a connection to the database
    const transaction = db.transaction(['pending'], 'readwrite');

    // access the object store
    const budgetObjectStore = transaction.objectStore('pending');

    // get all records from the store and set to a variable
    const getAll = budgetObjectStore.getAll();

    // when successful .getAll() executes...
    getAll.onsuccess = function () {
        // if there was data in indexDb's store, send it to the api server
        if (getAll.result.length > 0) {
            fetch('/api/transaction/bulk', {
                method: 'POST',
                body: JSON.stringify(getAll.result),
                headers: {
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json() )
                .then(serverResponse => {
                    if (serverResponse.message) {
                        throw new Error(serverResponse);
                    }

                    // open one more transaction
                    const transaction = db.transaction(['pending'], 'readwrite');

                    // access the pending object store
                    const budgetObjectStore = transaction.objectStore('pending');

                    // clear all items in the store
                    budgetObjectStore.clear();

                    alert('All saved transactions have been submitted');
                })
                .catch(err => {
                    console.log(err);
                });
        }
    }
};

request.onsuccess = function(event) {
    // when the database is successfully created with its object store (from onupgradeneeded event) or simply established a connection, save reference to the database in global variable
    db = event.target.result;

    // check if the app is online: if yes then run UploadPending() function to send a local database data to the api
    if (navigator.onLine) {
        const transaction = db.transaction(['pending'], 'readwrite');
        uploadPending();
    }
};

// listen for the app coming back online
window.addEventListener('online', uploadPending);