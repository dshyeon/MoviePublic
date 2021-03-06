const express = require('express');
const middleware = require('../middleware');
const bodyParser = require('body-parser');
const fuse = require('fuse.js');
const Fuse = require('../../node_modules/fuse.js/src/index.js');
const movieone = require('../fakeData1.js');
const movietwo = require('../fakeData2.js');
const router = express.Router();
const app = express();
const tmdb = require('../movieAPIHelpers/tmdb.js');
const tmdbHelp = require('../movieAPIHelpers/tmdbHelpers.js');
const models = require('../../db/models');
const searchDb = require('../../mongodb/db.js');
const MovieController = require('../controllers/movies.js');
const search = require('./search.js');

app.use(bodyParser.text({ type: 'text/plain' }));

const sortByKey = (array, key) => {
  return array.sort(function(a, b) {
    var x = a[key]; var y = b[key];
    return ((x < y) ? -1 : ((x > y) ? 1 : 0));
  });
};

router.route('/')
  .get (middleware.auth.verify, (req, res, next) => {
    var movies;
    searchDb.getMovies( (err, data) => {
      if (err) {
        console.log(err);
      } else {

        movies = data;

        var sorted = sortByKey(movies, 'year');

        models.Profile.where({ id: req.session.passport.user }).fetch()
          .then(profile => {
            if (profile.new_user) {
              res.redirect('/setup');
            } else {
              var movies;
              searchDb.getMovies((err, data) => {
                if (err) {
                  console.log(err);
                } else {
                  movies = data;
                  var sorted = sortByKey(movies, 'year');
                  res.render('index.ejs', {
                    data: {
                      movieone: sorted,
                      movietwo: sorted,
                      user: req.user
                    }
                    // data: movies // from fakeData file
                  });
                }
              });
            }
          });
      }
    });
  });


router.route('/login')
  .get((req, res) => {
    res.render('login.ejs', { message: req.flash('loginMessage') });
  })
  .post(middleware.passport.authenticate('local-login', {
    //if new user, then go to /setup, else go to movies page
    successRedirect: '/setup',
    failureRedirect: '/login',
    failureFlash: true
  }));

router.route('/favorites')
  .get(middleware.auth.verify, (req, res) => {
    // res.render('profile.ejs', {
    //   user: req.user // get the user out of session and pass to template
    // });
    // res.redirect('/account');
    res.render('index.ejs', {
      data: {
        user: req.user
      }
    });
  });

router.route('/profile')
  .get(middleware.auth.verify, (req, res) => {
    models.Profile.where({ id: req.session.passport.user }).fetch()
      .then(profile => {
        if (profile.new_user) {
          res.redirect('/setup');
        } else {
          res.render('index.ejs', {
            data: {
              user: req.user,
              movieFollow: profile.attributes.follow_movies || [],
              genreFollow: profile.attributes.follow_genre || [],
              actorFollow: profile.attributes.follow_actor || [],
              directorFollow: profile.attributes.follow_director || [],
              writerFollow: profile.attributes.follow_writers || [],
              vod_subscriptions: profile.attributes.vod_subscriptions || []
            }
          });
        }
      })
      .catch(err => {
        // This code indicates an outside service (the database) did not respond in time
        res.status(503).send(err);
      });
  });

router.route('/following')
  .get(middleware.auth.verify, (req, res) => {
    models.Profile.where({ id: req.session.passport.user }).fetch()
      .then(profile => {
        //TODO: get list of mongo movies here or on the client side?
        res.render('index.ejs', {
          data: {
            user: req.user,
            movieFollow: profile.attributes.follow_movies || [],
            genreFollow: profile.attributes.follow_genre || [],
            actorFollow: profile.attributes.follow_actor || [],
            directorFollow: profile.attributes.follow_director || [],
            writerFollow: profile.attributes.follow_writers || [],
            vod_subscriptions: profile.attributes.vod_subscriptions || []
          }
        });
      })
      .catch(err => {
        res.status(503).send(err);
      });
  });

router.route('/setup')
  .get(middleware.auth.verify, (req, res) => {
    //TODO: also get movies, writers, directors, and screenwriters to pass down
    models.Genres.fetchAll()
      .then(genreList => {
        var finalGenres = [];
        for (var i = 0; i < genreList.models.length; i++) {
          finalGenres.push(genreList.models[i].attributes);
        }
        res.render('index.ejs', {
          data: {
            user: req.user,
            genres: finalGenres
          }
        });
      })
      .catch(err => {
        console.log('*********** error ', err);
        res.status(503).send(err);
      });
  });

router.route('/logout')
  .get((req, res) => {
    console.log('******** logout call');
    req.logout();
    res.redirect('/');
  });

router.route('/search')
  .get((req, res, next) => {
    var outputarr = [];
    searchDb.getMovies({}, (err, res1) => {
      if (err) {
        alert('search broken try again');
      } else {
        tmdbHelp.getMoviesByTitle(req.query.value, (err, data) => {
          if (err) {
            console.log(err, 'ERRORGETMOVIESERROR');
          } else {
            //grab each movie title and send API request to OMDB to get movie data
            searchDb.saveMovies(data, () => {
              searchDb.getMovies({}, (err, res2) => {
                var options = {
                  shouldSort: true,
                  tokenize: true,
                  findAllMatches: true,
                  includeScore: true,
                  includeMatches: true,
                  threshold: 0.6,
                  location: 0,
                  distance: 100,
                  maxPatternLength: 32,
                  minMatchCharLength: 3,
                  keys: [
                    'title',
                    'actors',
                    'director',
                    'genre',
                    'year',
                  ]
                };
                var fuse = new Fuse(res2, options); // "list" is the item array
                var result = fuse.search(req.query.value);
                var sorted = sortByKey(result, 'score');
                // console.log('*************** sorted[0] ', sorted[0]);
                // console.log('************** sorted', sorted);
                // console.log(res2, 'Post Sorted - Res2');
                // MovieController.getAllMovies();
                var movieArr = [];
                for (var i = 0; i < sorted.length; i++) {
                  movieArr.push(sorted[i].item);
                  if (i === sorted.length - 1) {
                    res.json(movieArr);
                  }
                }
                MovieController.addMovies(sorted, (err, results) => {
                  if (err) {
                    console.log(err, 'Server Response - PG Unable to Add Movies');
                    // res.status(500).send('Postgres: Error adding movies');
                  } else {
                    // console.log(results, 'Server Response - PG Added Data');
                    // res.status(201).send('Server Response - PG Added Data');
                  }
                });

              });

            });
          }
        });

      }
      // else{
      //   var options = {
      //     shouldSort: true,
      //     tokenize: true,
      //     findAllMatches: true,
      //     includeScore: true,
      //     includeMatches: true,
      //     threshold: 0.6,
      //     location: 0,
      //     distance: 100,
      //     maxPatternLength: 32,
      //     minMatchCharLength: 3,
      //     keys: [
      //       "title",
      //       "actors",
      //       "director",
      //       "genre",
      //       "year",
      //
      //     ]
      //   };
      //   var fuse = new Fuse(res1, options); // "list" is the item array
      //   console.log(req.query.value, 'req.query.value')
      //   var result = fuse.search(req.query.value);
      //   var sorted = sortByKey(result, 'score');
      //   // res.render('index.ejs', {
      //   //   data: {
      //   //     movieone: sorted,
      //   //     movietwo: sorted,
      //   //     user: req.user
      //   //   }
      //   //   // data: movies // from fakeData file
      //   // });
      //   res.json(sorted);
      // }
    });

  });

router.get('/auth/google', middleware.passport.authenticate('google', {
  scope: ['email', 'profile']
}));

router.get('/auth/google/callback', middleware.passport.authenticate('google', {
  successRedirect: '/setup',
  failureRedirect: '/login'
}));

router.get('/auth/facebook', middleware.passport.authenticate('facebook', {
  scope: ['public_profile', 'email']
}));

router.get('/auth/facebook/callback', middleware.passport.authenticate('facebook', {
  successRedirect: '/setup',
  failureRedirect: '/login',
  failureFlash: true
}));

// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../react-client/dist/index.html'));
// });

// router.get('/auth/twitter', middleware.passport.authenticate('twitter'));
//
// router.get('/auth/twitter/callback', middleware.passport.authenticate('twitter', {
//   successRedirect: '/profile',
//   failureRedirect: '/login'
// }));

module.exports = router;

// app.use(express.static(__dirname + '/../react-client/dist'));

// var chosencategory;
// var dbvalues = [];

// var dbdata = function(data) {
//   for (var i = 0; i < data.length; i++) {
//     dbvalues.push(data[i].playlistname + ': ' + data[i].playlisturl);
//   }
//   console.log('the sql values are' + dbvalues);
// }

// var modifieddata = function(data) {
//   for (var i = 0; i < data.length; i++) {
//     if (data[i].push(chosencategory));
//   }

//   for (var m = 0; m < data.length; m++) {
//       var playlist = data[m];
//       mysql.insertValues(playlist);
//     }
// }

// // app.post('/items', function (req, res) {
// //   console.log('we received the POST request on the server!');
// //   var category = req.body;
// //   chosencategory = category;
// //   console.log(chosencategory);
// //   var newreq = apiHelpers.categoryRouter(category, apiHelpers.listFormatter);
// // });

// // app.get('/items', function (req, res) {
// //   console.log('we received the GET request on the server!')
// //   var category = req.query.value;
// //   mysql.grabValues(category, function(err, data) {
// //     if (err) {
// //       console.log(err);
// //     }
// //     else {
// //       console.log('this worked!');
// //       dbdata(data);
// //       res.send(dbvalues);
// //     }
// //   });
// // })
