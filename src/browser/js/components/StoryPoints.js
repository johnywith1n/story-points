import React from 'react';
import { Form, FormGroup, Label, Input } from 'reactstrap';
import io from 'socket.io-client';
import events from '../../../events';

import style from 'style/StoryPoints.css';

const socket = io();
const NO_SELECTION = 'Select a story point...';
const STORY_POINT_VALUES = [NO_SELECTION,'?',0,1,2,3,5,8,13,21,34,55];
const STORAGE_NAME_KEY = 'name';
const STORAGE_TOKEN_KEY = 'token';

class StoryPoints extends React.Component {
  constructor(props) {
    super(props);

    this.secret = new URLSearchParams(window.location.search).get('secret');

    this.state = {
      users: {},
      initialized: false,
    };
  }

  componentDidMount() {
    socket.on(events.STATE_UPDATE, (data) => {
      if (data.reset) {
        document.getElementById('storyPointsSelect').value = NO_SELECTION;
      }

      this.setState({
        ...data
      });
    });

    const name = window.localStorage.getItem(STORAGE_NAME_KEY);
    const sessionToken = window.localStorage.getItem(STORAGE_TOKEN_KEY);
    if (name) {
      socket.emit(events.ADD_USER, {
        ...this.createPayload(),
        name: name,
        token: sessionToken
      }, (data) => {
        const stateUpdates = {
          initialized: true
        };
        if (data.event === events.FAILED_JOIN) {
          alert(`Failed to automatically reconnect. Name "${name}" is already taken`);
        } else {
          stateUpdates.name = name;
        }
        this.setState(stateUpdates);
      });
    } else {
      this.setState({
        initialized: true
      });
    }

    window.onbeforeunload = () => {
      if (this.state.name) {
        socket.emit(events.REMOVE_USER, this.createPayload());
      }
    };
  }

  createPayload = () => {
    return {
      secret: this.secret,
      name: this.state.name,
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
      ...this.createPayload(),
      value,
    }, (data) => {
      if (data === events.DISCONNECTED) {
        alert('You\'ve been disconnected');
        window.location.reload();
      }
    });
  }

  toggleStoryPointSelectionVisibility = () => {
    socket.emit(events.SET_VISIBILITY, {
      ...this.createPayload(),
      visibility: !this.state.visibility
    });
  }

  resetAllPointSelections = () => {
    socket.emit(events.RESET_POINTS, this.createPayload());
  }

  nextStory = () => {
    socket.emit(events.NEXT_STORY, this.createPayload());
  }

  onJoinKeyPress = (e) => {
    if(e.key == 'Enter'){
      e.preventDefault();
      this.join();
    }
  }

  join = () => {
    const name = document.getElementById('name').value;
    if (!name) {
      return alert('Name cannot be empty');
    }
    const sessionToken = window.localStorage.getItem(STORAGE_TOKEN_KEY);
    socket.emit(events.ADD_USER, {
      ...this.createPayload(),
      name: name,
      token: sessionToken
    }, (data) => {
      if (data.event === events.FAILED_JOIN) {
        alert('that name is already taken');
      } else {
        window.localStorage.setItem(STORAGE_NAME_KEY, name);
        window.localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        this.setState({
          name: name
        });
      }
    });
  }

  getJoinPrompt() {
    return (
      <div className={style['prompt-window']}>
        <form className={style['form-container']}>
          <div className={style['form-group']}>
            <label className={style['form-label']}><b className={style['label']}>YOUR NAME</b></label>
            <input id="name" type="text" className={`form-control ${style['input']}`} placeholder="" 
              onKeyPress={this.onJoinKeyPress}
            />
          </div>
          <button type="button" className={`btn btn-primary ${style['button']}`} onClick={this.join}>
            JOIN
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
            <th><span className={style['label']}>Name</span></th>
            <th><span className={style['label']}>Status</span></th>
          </tr>
        </thead>
        <tbody className={style['status-table']}>
          {
            Object.keys(this.state.users).map(u => {
              const ready = this.state.users[u].value && this.state.users[u].value != NO_SELECTION;
              return (
                <tr key={u} className={ready ? style['table-row'] : `${style['pending']} ${style['table-row']}`}>
                  <td className={`${style['name']} ${style['td']}`}>
                    {u}
                  </td>
                  <td className={`${style['td']}`}>
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
    return STORY_POINT_VALUES.map(val => {
      if (mapping[val].length === 0) {
        return null;
      }
      const label = val === NO_SELECTION ? 'No Selection' : val;
      return (
        <div key={val} className={style['story-point-container']}>
          <div className={style['story-point']}>{label}</div>
          <div className={style['story-points-list']}>
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
        </div>
      );
    });
  }

  logout = () => {
    window.localStorage.removeItem(STORAGE_NAME_KEY);
    window.localStorage.removeItem(STORAGE_TOKEN_KEY);
    window.location.reload();
  }

  render() {
    if (!this.state.initialized) {
      return (
        <div className={`${style['container']} ${style['loading-container']}`}>
          <i className={`fas fa-spinner fa-spin ${style['loading-spinner']}`}></i>
        </div>
      );
    } else if (!this.state.name) {
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
              <FormGroup className={style['left-form-section']}>
                <Label for="storyPointsSelect" className={style['white-label']}>Select Story Point Value</Label>
                <Input type="select" name="storyPointsSelect" id="storyPointsSelect" className={`${style['input']} ${style['select']}`} 
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
            <button className={`btn btn-primary ${style['button-inverted']}`} type="button" onClick={this.toggleAdminControls}>
              { this.state.showAdmin ? 'Hide' : 'Show' } Admin Controls
            </button>
            {
              this.state.showAdmin &&
                <React.Fragment>
                  <button className={`btn btn-danger ${style['button-red']}`}  type="button" onClick={this.toggleStoryPointSelectionVisibility}>
                    {this.state.visibility ? 'Hide' : 'Show'} Point Selections
                  </button>
                  <button className={`btn btn-danger ${style['button-red']}`} type="button" onClick={this.nextStory}>
                    Next Story
                  </button>
                </React.Fragment>
            }
          </div>
          <div className={`${style['admin-controls']} ${style['logout']}`}>
            <button className={`btn btn-primary ${style['button-inverted']}`} type="button"  style={{padding: '0.5rem 3rem'}} onClick={this.logout}>
              Log out
            </button>
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