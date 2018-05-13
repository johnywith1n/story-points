import React from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import io from 'socket.io-client';
import events from '../../../events';

import style from 'style/StoryPoints.css';

const socket = io();
const NO_SELECTION = 'No Selection';
const STORY_POINT_VALUES = [NO_SELECTION,1,2,3,5,8,13,21,34,55];

class StoryPoints extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      users: {}
    };
  }

  componentDidMount() {
    socket.on(events.STATE_UPDATE, (data) => {
      this.setState({
        ...data
      });
    });

    window.onbeforeunload = () => {
      if (this.state.name) {
        socket.emit(events.REMOVE_USER, {name: this.state.name});
      }
    };
  }

  toggleAdminControls = () => {
    this.setState((prevState) => ({
      showAdmin: !prevState.showAdmin
    }));
  }

  selectStoryPoints = (e) => {
    const value = e.target.value;
    socket.emit(events.SET_POINT_VALUE, {
      value,
      name: this.state.name
    });
  }

  toggleStoryPointSelectionVisibility = () => {
    socket.emit(events.SET_VISIBILITY, {visibility: !this.state.visibility});
  }

  resetAllPointSelections = () => {
    socket.emit(events.RESET_POINTS);
  }

  join = () => {
    const name = document.getElementById('name').value;
    socket.emit(events.ADD_USER, {name: name}, (data) => {
      if (data === events.FAILED_JOIN) {
        alert('that name is already taken');
      } else {
        this.setState({
          name: name
        });
      }
    });
  }

  getJoinPrompt() {
    return (
      <div>
        <form>
          <div className="form-group">
            <label>What is your name?</label>
            <input id="name" type="text" className="form-control" placeholder="name" />
          </div>
          <button type="button" className="btn btn-primary" onClick={this.join}>
            Join
          </button>
        </form>
      </div>
    );
  }

  showUserStatus() {
    const status = {};
    Object.keys(this.state.users).forEach(u => {
      status[u] = this.state.users[u].value;
    });
    return (
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className={style['status-table']}>
          {
            Object.keys(this.state.users).map(u => {
              const ready = this.state.users[u].value && this.state.users[u].value != NO_SELECTION;
              return (
                <tr key={u} className={ready ? '' : style['pending']}>
                  <td className={style['name']}>
                    {u}
                  </td>
                  <td>
                    {
                      ready ?
                        'Ready' :
                        'Deciding'
                    }
                  </td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    );
  }

  getStoryPointsView(mapping) {
    return STORY_POINT_VALUES.map(val => (
      mapping[val].length > 0 &&
      <div key={val} className={style['story-point-container']}>
        <div className={style['story-point']}>{val}</div>
        <ul>
          {
            mapping[val].map(user => (
              <li key={user}>
                {user}
              </li>
            ))
          }
        </ul>
      </div>
    ));
  }

  render() {
    if (!this.state.name) {
      return this.getJoinPrompt();
    }

    const mapping = {};
    STORY_POINT_VALUES.forEach(v => mapping[v] = []);
    Object.keys(this.state.users).forEach(u => {
      const value = this.state.users[u].value || NO_SELECTION;
      mapping[value].push(u);
    });

    return (
      <div className={style['container']}>
        <div className={style['sidebar']}>
          <div>
            <Form>
              <FormGroup>
                <Label for="storyPointsSelect">Select Story Point Value</Label>
                <Input type="select" name="storyPointsSelect" id="storyPointsSelect"
                  onChange={this.selectStoryPoints}
                >
                  {
                    STORY_POINT_VALUES.map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))
                  }
                </Input>
              </FormGroup>
            </Form>
          </div>
          <div className={style['admin-controls']}>
            <button className="btn btn-primary" type="button" onClick={this.toggleAdminControls}>
              { this.state.showAdmin ? 'Hide' : 'Show' } Admin Controls
            </button>
            {
              this.state.showAdmin &&
                <React.Fragment>
                  <button className="btn btn-danger" type="button" onClick={this.toggleStoryPointSelectionVisibility}>
                    Toggle Point Selections Visibility
                  </button>
                  <button className="btn btn-danger" type="button" onClick={this.resetAllPointSelections}>
                    Reset All Users' Point Selections
                  </button>
                </React.Fragment>
            }
          </div>
        </div>
        <div className={style['main-content']}>
          {
            this.state.visibility ?
              this.getStoryPointsView(mapping) :
              this.showUserStatus()
          }
        </div>
      </div>
    );
  }
}

export default StoryPoints;