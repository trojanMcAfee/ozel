// const tasks = require('./event-listener');

let myTasks;


function fill(task) {

    console.log('taskstt: ', task);

    myTasks = task;

    console.log('myTasks: ', myTasks);

}

// function run() {
//     console.log('my: ', myTasks);
// }

// run();


module.exports = {fill};

