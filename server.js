'use strict';
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const superagent = require('superagent');

const pg=require('pg');
//const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DEV_MODE ? false : { rejectUnauthorized: false } });
const client = new pg.Client( { connectionString: process.env.DATABASE_URL, ssl: process.env.LOCALLY ? false : {rejectUnauthorized: false}} );
//const clinet= new pg.Client(process.env.DATABASE_URL);
const server=express();
const PORT=process.env.PORT || 3000;

// server.listen(PORT,()=>{
//   console.log(`listening on port ${PORT}`);
// });

client.connect()
  .then(() => {
    server.listen(PORT, () =>{
      console.log(`listening on ${PORT}`);
    }); });

server.use(cors());


// server.get('/data',(req,res)=>{
//   res.status(200).send('Hi from the data page, I am the server !!!');
// });

//	http://localhost:5000/location?city=amman

server.get('/location',locationHandler);
server.get('/weather',weatherHandler);
server.get('/parks',parkHandler);
server.get('/movies',moviesHandler);
server.get('/yelp',yelpHandelr);
server.get('*',generalHandler);


//server.get('/yelp',parkHandler);
//pk.f7c16ea4ef7fffdc3b4cbaeb3fd07102
//VG7a8BnF9CQ13Bwtd8LTKGqofgtDiiazhqLUNbQ3
//[ Base URL: developer.nps.gov/api/v1 ]

//let parkurl=`https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}`



function locationHandler(req,res){
  let cityName=req.query.city;
  let key=process.env.LOCATION_KEY;
  let SQL = `select * from location  where search_query = $1`;
  let locURL=`https://us1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;

  client.query(SQL,[cityName])
    .then(data=>{
      if (data.rowCount>0){
        console.log('we are work in database');
        res.send(data.rows[0]);
      }else{
        superagent.get(locURL)
          .then(geodata=>{
            console.log('we are work in api');
            let gData = geodata.body;
            console.log(gData);

            let locationData = new Location(cityName,gData);

            let search_query=cityName;
            let formatted_query=gData[0].display_name;
            let latitude=gData[0].lat;
            let longitude=gData[0].lon;

            let SQL = `INSERT INTO location (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;`;
            let safeValues=[search_query,formatted_query,latitude,longitude];
            client.query(SQL,safeValues)
              .then(result=>{
                res.send(locationData);
              })
              .catch(error=>{
                res.send(error);
              });
          })
          .catch(error=>{
            console.log(error);
            res.send(error);
          });
      }
    });
}




function weatherHandler(req,res){
  let weather =[];
  let cityName=req.query.search_query;
  let key=process.env.WEATHER_KEY;
  let weaURL=`http://api.weatherbit.io/v2.0/forecast/daily?city=${cityName}&key=${key}&days=5`;
  superagent.get(weaURL)
    .then(wetDATA=>{
      wetDATA.body.data.map(item=>{
        let weatherRes= new Weather (item);
        weather.push(weatherRes);
      });
      res.send(weather);
    })
    .catch(error=>{
      console.log(error);
      res.send(error);
    });
}


function parkHandler(req,res){
  let park =[];
  let cityName=req.query.search_query;
  let key=process.env.PARK_KEY;
  let parkURL=`https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}&limit=8`;
  superagent.get(parkURL)

    .then(parkDATA=>{
      parkDATA.body.data.map(item=>{
        let parkRes= new Park (item);
        park.push(parkRes);
      });
      res.send(park);
    })
    .catch(error=>{
      console.log(error);
      res.send(error);
    });
}

//1eb0ecbca164aaa2ab03f0e0fd52e220
function moviesHandler(req,res){
  let cityName=req.query.search_query;
  let Key=process.env.MOVIE_API_KEY;
  //https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${city}&language=de-DE&region=DE
  //let moviesURL = `https://api.themoviedb.org/3/discover/movie?api_key=${Key}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false`;
  let moviesURL=`https://api.themoviedb.org/3/search/movie?api_key=${Key}&query=${cityName}`;
  superagent.get(moviesURL)
    .then(data=>{
      console.log('data');
      let getdata=data.body.results;
      console.log(getdata);
      let newdata= getdata.map((item)=>{
        return new Movie (item);
      });
      res.send(newdata);
    })
    .catch(error=>{
      console.log(error);
      res.send(error);
    });
}
//ys5Xhqe3Qc1T1tmjOaDHd1ZH5i50Q4MMZmSG3xXsaSPolBCpYqTkLjrxEz4nkLpx4UQoFhwKju7HiBwnKGgR_GKpTmRatCLLSNsEuTmYM92RQ6zQg4fcwx32QnyMYHYx
//HJZqkrfLLxcF9l4xLWZCYA
// function yelphandler(req,res){
//   let yelp_key=process.env.YELP_API_KEY;
//   let cityName=req.query.search_query;
//   let page =req.query.page;
//   const resultPerPage=5;
//   const start=((page -1)* resultPerPage +1);
//   let yelpURL=`https://api.yelp.com/v3/businesses/search?location=${cityName}&limit=${resultPerPage}$offset=${start}`;
//   superagent.get(yelpURL)
//     .set('Authorization',`Bearer ${yelp_key}`)
//     .then(data => {
//       let getdata=data.body.businesses;
//       let newData=getdata.map(item =>{
//         return new Yelp (item);
//       });
//       res.send(newData);
//     })
//     .catch(error=>{
//       console.log(error);
//       res.send(error);
//     });
// }


function yelpHandelr(req, res) {
  let cityName = req.query.search_query;
  let page = req.query.page;
  let key = process.env.YELP_API_KEY;
  const resultPerPAge = 5;
  const start = ((page - 1) * resultPerPAge + 1);
  let yelpURL = `https://api.yelp.com/v3/businesses/search?location=${cityName}&limit=${resultPerPAge}&offset=${start}`;
  superagent.get(yelpURL)
    .set('Authorization', `Bearer ${key}`)
    .then(data => {
      let yelpData = data.body.businesses;
      let yelpInfo = yelpData.map((item) => {
        return new Yelp(item);});
      res.send(yelpInfo);
    })
    .catch(error => {
      res.send(error);
    });}






function Weather(local){
  this.forecast=local.weather.description;
  this.time= new Date(local.datetime).toString().slice(0,15);
}

function Location(cityName,locData){
  this.search_query=cityName;
  this.formatted_query=locData[0].display_name;
  this.latitude=locData[0].lat;
  this.longitude=locData[0].lon;
}

function Park(cityName){
  this.name=cityName.fullName;
  this.address=`${cityName.addresses[0].line1},${cityName.addresses[0].city},${cityName.addresses[0].stateCode},${cityName.addresses[0].postalCode}`;
  this.fee='0.00';
  this.description=cityName.description;
  this.url=cityName.url;
}

function Movie(moviesData){
  console.log(moviesData);
  this.title=moviesData.title;
  this.overview=moviesData.overview;
  this.average_votes=moviesData.average_votes;
  this.total_votes=moviesData.vote_count;
  this.image_url=`https://image.tmdb.org/t/p/w500${moviesData.poster_path}`;
  this.popularity=moviesData.popularity;
  this.released_on=moviesData.released_data;
}

function Yelp(yelpData){
  this.name=yelpData.name;
  this.image_url=yelpData.image_url;
  this.price=yelpData.price;
  this.rating=yelpData.rating;
  this.url=yelpData.url;
}

function generalHandler(req,res){
  let errObj = {
    status: 500,
    resText: 'sorry! this page not found'
  };
  res.status(404).send(errObj);
}


