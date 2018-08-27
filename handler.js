'use strict';

const axios = require('axios');

let date = new Date();
let today = `${date.getDate()}${date.getMonth()}${date.getFullYear()}`;

let getRestaurantIds = axios.get('http://localhost:3000/authentication')
let getTransactions = axios.get('http://localhost:3000/populate')
let uploadCustomersDataToS3 = (uid) => {
  axios.get('http://localhost:3000/customer/listbydate', {
    headers: {
      uid: uid,
    }
  })
  .then(({ data }) => {
    let arrData = data.data.map((datum) => {
      return [ datum.genderML , Number(datum.birthYear), datum.occupationML ];
    })
    console.log(arrData);
  })
}

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

module.exports.hello = async (event, context, callback) => {
  Promise.all([getRestaurantIds, getTransactions])
    .then(responses => {
      let restaurantIds = responses[0].data.data.map(datum => {
        return datum.uid;
      })

      let transactions = []
      responses[1].data.map((datum) => {
        return datum.itemsOrderedML.map((item) => {
          return transactions.push([datum.customer.genderML, +(datum.customer.birthYear), datum.customer.occupationML, item]);
        })
      })

      let customersDataPromises = restaurantIds.map(restaurantId => {
        return getCustomersData(restaurantId);
      })

      // uploadCustomersDataToS3(re)

      // Promise.all(customersDataPromises)
      //   .then((responses) => {
      //     responses.map(datum => {
      //       datum.data.data.map((datum) => {
      //         console.log([ datum.genderML , Number(datum.birthYear), datum.occupationML ]);
      //       })
      //     })
      //   })
    })
};
