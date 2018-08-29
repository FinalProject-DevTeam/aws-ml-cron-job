'use strict';

const axios = require('axios');

let date = new Date();
let today = `${date.getDate()}${date.getMonth()}${date.getFullYear()}test28`;
let predictionsProcess = false

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
let getDataSourceStatus = (payload) => (
  axios.get(`http://localhost:3000/aws/datasource/${payload}`)
)
let createNewBatchPrediction = (payload) => (
  axios.post(`http://localhost:3000/aws/prediction/${payload}`)
)
// let getBatchPredictionStatus = (payload) => (
//   axios.get(`http://localhost:3000/aws/predictionstatus/${payload}`)
// )
// let getBatchPredictionStatus = (payload) => {
//   console.log('berapa kali');
//   return
// }
let getPrediction = (payload) => (
  axios.get(`http://localhost:3000/aws/prediction/${payload}`)
)

module.exports.hello = (event, context, callback) => {

  Promise.all([getRestaurantIds, getTransactions])
    .then(responses => {
      let restaurantIds = responses[0].data.data.map(datum => {
        return datum.uid;
      })

      let transactions = []
      responses[1].data.map(datum => {
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

      // let predictionsInterval = setTimeout(function run() {
      //   if (predictionsProcess === true) {
      //     let batchPredictionStatusPromises = restaurantIds.map(restaurantId => {
      //       return axios.get(`http://localhost:3000/aws/predictionstatus/${restaurantId}`);
      //     })
      //     let batchPredictionsStatusInterval = setTimeout(function run() {
      //       console.log('ini didalam setTimeout');
      //       Promise.all(batchPredictionStatusPromises)
      //       .then(responses => {
      //         console.log('ini didalam then promise all batchPredictionsStatusPromises');
      //         let batchPredictionsStatus = responses.filter(response => response.data === 'COMPLETED')
      //         if (batchPredictionsStatus.length === restaurantIds.length) {
      //           batchPredictionsStatus.map(b => {
      //             console.log('IF => ', b.data);
      //           })
      //
      //           for (let v = 0; v < batchPredictionsStatus.length; v++) {
      //             console.log('prediction => ', batchPredictionsStatus[v].data);
      //           }
      //           clearTimeout(batchPredictionsStatusInterval)
      //         } else {
      //           responses.map(b => {
      //             console.log('ELSE => ', b.data);
      //           })
      //           setTimeout(run, 5000)
      //         }
      //       })
      //     }, 5000)
      //     console.log('predictionsProcess => ', predictionsProcess);
      //     clearTimeout(predictionsInterval)
      //   } else {
      //     console.log('predictionsProcess => ', predictionsProcess);
      //     setTimeout(run, 5000)
      //   }
      // }, 5000)

      uploadToS3(payload)
        .then((response) => {
          let transactionsDatasourcePayload = {
            dataName: 'transactions-data',
            folderName: 'transactionsData'
          }
          addDatasource(transactionsDatasourcePayload)
            .then(response => {
              let transactionsDatasourceStatusInterval = setTimeout(function run() {
                getDataSourceStatus(today)
                  .then(response => {
                    if (response.data === 'COMPLETED') {
                      axios.post('http://localhost:3000/aws/model')
                      console.log('Transactions => ', response.data);
                      clearTimeout(transactionsDatasourceStatusInterval)
                    } else {
                      console.log('Transactions => ', response.data);
                      setTimeout(run, 5000);
                    }
                  })
              }, 5000)
            })
        })

        let customersDataPromises = restaurantIds.map(restaurantId => {
          return getCustomersData(restaurantId)
        })

        Promise.all(customersDataPromises)
        .then(responses => {
          let allCustomersData = []
          for (let i = 0; i < responses.length; i++) {
            let restoCustomersData = []
            let restaurantId = restaurantIds[i]
            for (let j = 0; j < responses[i].data.data.length; j++) {
              let customer = responses[i].data.data[j]
              restoCustomersData.push([customer.genderML , Number(customer.birthYear), customer.occupationML])
            }
            allCustomersData.push(restoCustomersData)
          }
          // console.log(allCustomersData);
          let uploadToS3Promises = []
          for (let j = 0; j < restaurantIds.length; j++) {
            let uid = restaurantIds[j]
            let customersDataColumns = {
              gender: "gender",
              birthYear: "birthyear",
              occupation: "occupation",
            }
            let customersDataPayload = {
              arrData: allCustomersData[j],
              dataName: 'customers-data',
              folderName: `customersData`,
              columns: customersDataColumns,
              id: uid,
            }
            uploadToS3Promises.push(uploadToS3(customersDataPayload));
          }
          console.log(uploadToS3Promises);
          Promise.all(uploadToS3Promises)
          .then(responses => {
            // console.log(responses);
            let addDatasourcePromises = []
            for (let i = 0; i < restaurantIds.length; i++) {
              let uid = restaurantIds[i]
              let customersDatasourcePayload = {
                dataName: 'customers-data',
                folderName: `customersData`,
                id: uid
              }
              addDatasourcePromises.push(addDatasource(customersDatasourcePayload))
            }
            console.log(addDatasourcePromises);
            Promise.all(addDatasourcePromises)
            .then(responses => {
              let datasourceStatusPromises = restaurantIds.map(restaurantId => {
                return getDataSourceStatus(`${restaurantId}-${today}`)
              })
              let customersDataStatusInterval = setTimeout(function run() {
                Promise.all(datasourceStatusPromises)
                  .then(responses => {
                    let customersDataSourceStatus = responses.filter(response => response.data === 'COMPLETED')
                      if (customersDataSourceStatus.length === restaurantIds.length) {
                        axios.post('http://localhost:3000/aws/model')
                          .then(response => {
                            let modelStatusInterval = setTimeout(function run () {
                              axios.get(`http://localhost:3000/aws/model/${today}`)
                              .then(response => {
                                if (response.data === 'COMPLETED') {
                                  let createNewBatchPredictionPromises = restaurantIds.map(restaurantId => {
                                    return createNewBatchPrediction(restaurantId);
                                  })
                                  Promise.all(createNewBatchPredictionPromises)
                                  .then(responses => {
                                    let predictionInterval = setTimeout(function () {
                                      let getPredictionPromises = restaurantIds.map(restaurantId => {
                                        return getPrediction(restaurantId);
                                      })
                                      Promise.all(getPredictionPromises)
                                      .then(responses => {
                                        let predictionsData = responses.map(response => {
                                          return response.data;
                                        })
                                        for (let j = 0; j < predictionsData.length; j++) {
                                          let resultArr = [];
                                          let currentPrediction = predictionsData[j]
                                          for(let i = 1; i < currentPrediction.length; i++) {
                                            let index = 0;
                                            let maxNumber = 0;
                                            let food = '';
                                            for(let k = 0; k < currentPrediction[i].length; k++) {
                                              if(currentPrediction[i][k] > maxNumber) {
                                                maxNumber = currentPrediction[i][k];
                                                index = k;
                                                food = currentPrediction[0][k];
                                              }
                                            }
                                            resultArr.push(food)
                                          }

                                          axios.get(`http://localhost:3000/customer/listbydate`, {
                                            headers: {
                                              uid: restaurantIds[j],
                                            }
                                          }).then(customer => {
                                            let dataCustomers = customer.data.data;
                                            for (let i = 0; i < dataCustomers.length; i++) {
                                              let findDot = resultArr[i].indexOf('.');
                                              if (findDot === -1) {
                                                dataCustomers[i].foodfav = resultArr[i];
                                              }
                                              else {
                                                dataCustomers[i].foodfav = resultArr[i].split('.').join(' ');
                                              }

                                            }

                                            dataCustomers.map(customer => {
                                              axios.post(`http://localhost:3000/customer/setdata/${customer.id}`, customer)
                                              .then(result => {
                                                console.log('berhasil', '=>', result.data)
                                              })
                                            })
                                          })
                                        }
                                      })
                                    }, 600000)
                                  })
                                  console.log('model => ', response.data);
                                  clearTimeout(modelStatusInterval)
                                } else {
                                  console.log('model => ', response.data);
                                  setTimeout(run, 5000)
                                }
                              })
                            }, 5000)
                          })
                        for (let m = 0; m < customersDataSourceStatus.length; m++) {
                          console.log('customers => ', customersDataSourceStatus[m].data);
                        }
                        clearTimeout(customersDataStatusInterval)
                      } else {
                        for (let m = 0; m < customersDataSourceStatus.length; m++) {
                          console.log('customers => ', customersDataSourceStatus[m].data);
                        }
                        setTimeout(run, 5000)
                      }
                  })
              }, 5000)
            })
          })

        })

    })
};
