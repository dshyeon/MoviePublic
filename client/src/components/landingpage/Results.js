import React from 'react';
import _ from 'lodash';
import $ from 'jquery';
import {GridList, GridTile} from 'material-ui/GridList';
import IconButton from 'material-ui/IconButton';
import Favorite from 'material-ui/svg-icons/action/favorite';
import FavoriteBorder from 'material-ui/svg-icons/action/favorite-border';
import Subheader from 'material-ui/Subheader';
import Search from './Search';
import Filtering from './Filtering';
import ResultsListItem from './ResultItem';

class Results extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      favoriteId: [],
      favorites: [],
      movies: this.props.results
    };
  }

  searchToServer(cb) {
    var searchInput = document.getElementById('text-field').value;
    console.log(searchInput);
    $.ajax({
      url: '/search',
      method: 'GET',
      data: {value: searchInput},
      dataType: 'json',
      contentType: 'text/plain',
      success: (results) => {
        var container = [];
        for (var i = 0; i < results.length; i++) {
          container.push(results[i].item);
        }
        // this.setState({movies: this.state.movies.concat(results)});
        this.setState({
          movies: container
        });

        // console.log(this.state.movies, '@#$#@$#@');
        // this.render();
      },
      error: (err) => {
        console.log('err', err);
      }
    });

  }

  handleSearch() {
    this.searchToServer( () => {
      this.render();
    });
  }

  addFavorites(movie) {
    $.ajax({
      method: 'POST',
      url: '/api/profiles/addfavorites',
      data: movie,
      success: (user) => {
        // user = JSON.parse(user);
        console.log('********* success favorites updated for user ' + user);
      },
      error: (error) => {
        console.log('************* error updating favorites for user', error);
      }
    });
  }

  // getFavorites(callback) {
  //   $.ajax({
  //     url: '/api/profiles/getfavorites',
  //     method: 'GET',
  //     dataType: 'json',
  //     success: (results) => {
  //       callback(results.favorites);
  //     },
  //     error: (err) => {
  //       console.log('err', err);
  //     }
  //   });
  // }

  render() {
    // console.log(this.state.movies, '10000')
    return (
      <div className='gridRoot container'>
        <div className='row'>
          <div className='col-6'>
            <Search searchToServer={this.handleSearch.bind(this)}/>
          </div>
          <div className='col-6'>
            <Filtering />
          </div>
        </div>  
        <GridList
          cellHeight='auto'
          cols={5}
          className='gridList'>
          <Subheader>Popular Movies</Subheader>
          {(this.state.movies).map( (movie, i) => (
            <ResultsListItem
              k={i}
              movieP={movie}
            />
          ))}
        </GridList>
      </div>
    );
  }
}

export default Results;
