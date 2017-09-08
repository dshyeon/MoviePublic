import React from 'react';
import Subheader from 'material-ui/Subheader';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Divider from 'material-ui/Divider';
import AutoComplete from 'material-ui/AutoComplete';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import ContentAdd from 'material-ui/svg-icons/content/add';

class FollowSetup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      follow_movie: [],
      follow_genre: [],
      follow_actor: [],
      follow_director: [],
      follow_writer: [],
      movie_list: [{'text': 'Raiders of the Lost Ark', 'id': 1}, {'text': 'Temple of Doom', 'id': 2}],
      genre_list: [{'text': 'Comedy', 'id': 1}, {'text': 'Horror', 'id': 2}, {'text': 'Drama', 'id': 3}],
      actor_list: [{'text': 'Jennifer Aniston', 'id': 1}, {'text': 'Brad Pitt', 'id': 2}],
      director_list: [{'text': 'Quentin Tarantino', 'id': 1}, {'text': 'Other directors', 'id': 2}],
      writer_list: [{'text': 'Quentin Tarantino', 'id': 1}, {'text': 'Other writers', 'id': 2}],
      select_value: 0,
      hintText: ['Enter a Movie to Follow', 'Enter a Movie Genre to Follow', 'Enter an Actor/Actress to Follow', 'Enter a Director to Follow', 'Enter a Screenwriter to Follow'],
      dataSource: [{'text': 'Raiders of the Lost Ark', 'id': 1}, {'text': 'Temple of Doom', 'id': 2}], //need to pass this movie data down as props for first render to work
      latestFollow: '',
      addToDB: false
    };
  }

  componentDidMount() {
    // data should be in format [{text: 'text for dropdown', id: <unique id>}, ..]
    //get all movie and id data
    // do first before loading rendering component, rest can be async
    //get all genre and id data
    //get all actor and id data
    //get all director and id data
    //get all writer and id data
    //set to state for datasources in autocomplete fields
  }

  getValue(index, callback) {
    var followList = ['movie', 'genre', 'actor', 'director', 'writer'];
    callback(followList[index]);
  }

  handleChange(e, i, value) {
    this.getValue(value, dataSourceName => {
      this.setState({
        select_value: value,
        latestFollow: '',
        addToDB: false,
        dataSource: this.state[dataSourceName + '_list']
      });
      this.refs['autoComplete'].setState({
        searchText: '',
        hintText: this.state.hintText[value]
      });
      this.refs['autoComplete'].focus();
    });
  }

  setLatestFollow(chosenRequest, index) {
    if (index === -1) {
      this.setState({
        latestFollow: chosenRequest,
        addToDB: true
      });
    } else {
      this.setState({
        latestFollow: this.state.dataSource[index]['id']
      });
    }
  }

  addFollow(e) {
    this.getValue(this.state.select_value, dataSourceName => {
      var followName = 'follow_' + dataSourceName;
      if (!this.state.addToDB) {
        this.setState({
          followName: this.state[followName].push(this.state.latestFollow)
        });
      } else {
        //not an existing value in the DB
        //add to a crone job to search for it? check if already exists in the job
        //add to favorites list without an id for now?
        //crone job will have to check for non-id values and replace them as possible
        this.setState({
          followName: this.state[followName].push(this.state.latestFollow),
          addToDB: true
        });
      }
    });
  }

  render() {
    const dataSourceConfig = {
      text: 'text',
      value: 'id'
    };
    return (
      <div className='follow'>
        <Subheader>{this.props.header}</Subheader>
        <br/><br/>
        <SelectField value={this.state.select_value} onChange={this.handleChange.bind(this)} autoWidth={true}>
          <MenuItem value={0} primaryText='Movie' />
          <MenuItem value={1} primaryText='Genre' />
          <MenuItem value={2} primaryText='Actor' />
          <MenuItem value={3} primaryText='Director' />
          <MenuItem value={4} primaryText='Screenwriter' />
        </SelectField>
        <br/>
        <AutoComplete
          id='follow-field'
          ref={'autoComplete'}
          hintText={this.state.hintText[this.state.select_value]}
          filter={AutoComplete.fuzzyFilter}
          dataSource={this.state.dataSource}
          dataSourceConfig={dataSourceConfig}
          maxSearchResults={10}
          onNewRequest={this.setLatestFollow.bind(this)}
        />
        <div>
          <FloatingActionButton className='floatButton' mini={true} onClick={this.addFollow.bind(this)}>
            <ContentAdd />
          </FloatingActionButton>
        </div>
        <Divider inset={true}/>
        <br/>
        <Subheader>Your Current Following:</Subheader>
        Display Movies, Genres, Actors, Directors, Screenwriters Here with DELETE keys
      </div>
    );
  }
}

export default FollowSetup;
