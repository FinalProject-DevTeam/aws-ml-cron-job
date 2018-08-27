'use strict';

const axios = require('axios');

let date = new Date();
let today = `${date.getDate()}${date.getMonth()}${date.getFullYear()}`;

let getRestaurantIds = axios.get('http://localhost:3000/authentication')
let getTransactions = axios.get('http://localhost:3000/populate')
let getCustomersData = (uid) => (
  axios.get('http://localhost:3000/customer/listbydate', {
    headers: {
      uid: uid,
    }
  })
)
let uploadToS3 = (payload) => (
  axios.post('http://localhost:3000/aws/s3', payload)
)
let addDatasource = (payload) => (
  axios.post('http://localhost:3000/aws/datasource', payload)
)

// let helloFromTimeout = (val) => {
//   console.log(val);
// }


// let functionalTest = arrOfValues.map((val) => {
//   return setTimeout(function () {
//       helloFromTimeout('test')
//     }, 1 );
// })

// let promising = (value) => {
//   return new Promise(function(resolve, reject) {
//     setTimeout(resolve, 100, 'foo')
//   });
// }

// let arrOfPromises = arrOfValues.map((val) => {
//   return new Promise(function(resolve, reject) {
//     setTimeout(resolve, 100, val)
//   });
// })
//
// let p = Promise.all(arrOfPromises).then((value) => { console.log(value); })
//
// console.log('sebelum timeout => ', p);
//
// setTimeout(function () {
//   console.log('the stack is now empty');
//   console.log('di dalam timeout => ', p);
// })
//
// console.log('setelah timeout => ', p);

module.exports.hello = (event, context, callback) => {
  axios.post('http://localhost:3000/aws/model')

  Promise.all([getRestaurantIds, getTransactions])
    .then(responses => {
      let restaurantIds = responses[0].data.data.map(datum => {
        return datum.uid;
      })

      let transactions = []
      responses[1].data.map((datum) => {
        // if (datum.customer === undefined) {
        //   console.log('transactionid => ', datum.id);
        //   console.log('transaction customer id => ', datum.customer);
        // }
        // console.log(datum.customer);
        return datum.itemsOrderedML.map((item) => {
          return transactions.push([datum.customer.genderML, +(datum.customer.birthYear), datum.customer.occupationML, item]);
        })
      })

      let columns = {
        gender: "gender",
        birthYear: "birthyear",
        occupation: "occupation",
        ordered_item: "ordered_item",
      }

      let payload = {
        arrData: transactions,
        dataName: 'transactions-data',
        folderName: 'transactionsData',
        columns: columns,
        id: '',
      }

    // let modelStatusInterval = setInterval(function () {
    //   axios.get(`http://localhost:3000/aws/model/${today}`)
    //     .then((response) => {
    //       if (response.data === 'COMPLETED') {
    //         clearInterval(modelStatusInterval)
    //         console.log(response.data);
    //         return ;
    //       }
    //     })
    // }, 1000)

    let modelStatusInterval = setTimeout(function run() {
      axios.get(`http://localhost:3000/aws/model/test`)
        .then((response) => {
          if (response.data === 'COMPLETED') {
            clearTimeout(modelStatusInterval)
            console.log(response.data);
            return false;
          } else {
            console.log(response.data);
            setTimeout(run, 1000);
          }
        })
    }, 1000);

      // uploadToS3(payload)
      //   .then((response) => {
      //     // console.log(response);
      //     let payload = {
      //       dataName: 'transactions-data',
      //       folderName: 'transactionsData'
      //     }
      //     addDatasource(payload)
      //       .then(response => {
      //
      //       })
      //   })



      // let customersDataPromises = restaurantIds.map(restaurantId => {
      //   return getCustomersData(restaurantId)
      // })
      // // console.log(arrOfCustomerDataPromises);
      // Promise.all(customersDataPromises)
      //   .then(responses => {
      //     let allCustomersData = []
      //     for (let i = 0; i < responses.length; i++) {
      //       let restoCustomersData = []
      //       let restaurantId = restaurantIds[i]
      //       for (let j = 0; j < responses[i].data.data.length; j++) {
      //         let customer = responses[i].data.data[j]
      //         restoCustomersData.push([customer.genderML , Number(customer.birthYear), customer.occupationML])
      //       }
      //       allCustomersData.push(restoCustomersData)
      //     }
      //     // console.log(allCustomersData);
      //     let uploadToS3Promises = []
      //     for (let j = 0; j < restaurantIds.length; j++) {
      //       let uid = restaurantIds[j]
      //       let columns = {
      //         gender: "gender",
      //         birthYear: "birthyear",
      //         occupation: "occupation",
      //       }
      //       let payload = {
      //         arrData: allCustomersData[j],
      //         dataName: 'customers-data',
      //         folderName: `customersData`,
      //         columns: columns,
      //         id: uid,
      //       }
      //       uploadToS3Promises.push(uploadToS3(payload));
      //     }
      //     // console.log(uploadToS3Promises);
      //     Promise.all(uploadToS3Promises)
      //       .then(responses => {
      //         // console.log(responses);
      //         let addDatasourcePromises = []
      //         for (let i = 0; i < restaurantIds.length; i++) {
      //           let uid = restaurantIds[i]
      //           let payload = {
      //             dataName: 'customers-data',
      //             folderName: `customersData`,
      //             id: uid
      //           }
      //           addDatasourcePromises.push(addDatasource(payload))
      //         }
      //         // console.log(addDatasourcePromises);
      //         Promise.all(addDatasourcePromises)
      //           .then(responses => {
      //             console.log(responses);
      //           })
      //       })
      //   })
    })
};
