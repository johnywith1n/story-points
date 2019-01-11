import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

import { Form, FormGroup, Label, Input } from 'reactstrap';
import io from 'socket.io-client';
import events from '../../../events';

import Timer from './Timer';

import style from 'style/StoryPoints.css';

const socket = io();
const NO_SELECTION = 'Select a story point...';
const STORY_POINT_VALUES = [NO_SELECTION,'?',0,0.5,1,2,3,5,8,13,21,34,55];

const STORAGE_NAME_KEY = 'name';
const STORAGE_TOKEN_KEY = 'token';
const STORAGE_IS_QA_KEY = 'isQA';
const STORAGE_ROOM_NAME = 'room';

const SELECT_ID = 'storyPointsSelect';
let EXTERNAL_POPUP_WINDOW = null;

/**
 * Component for handling picking story points in a pop up
 * Use case is so that the presenter doesn't have to have their selection
 * shown on the display
 *
 * @class StoryPointsPopup
 * @extends {React.Component}
 */
class StoryPointsPopup extends React.Component {
  constructor(props) {
    super(props);

    this.closed = false;
    this.state = {
      externalWindow: null,
      containerEl: null
    };
  }

  static propTypes = {
    cleanup: PropTypes.func.isRequired,
  }

  componentDidMount() {
    // need to move node to new window BEFORE rendering
    // see https://github.com/facebook/react/issues/12355#issuecomment-410996235
    let externalWindow = window.open('', '', 'width=600,height=400');
    EXTERNAL_POPUP_WINDOW = externalWindow;
    let containerEl = document.createElement('div');
    externalWindow.document.body.appendChild(containerEl);
    externalWindow.onbeforeunload = this.cleanup;
    this.setState({
      externalWindow,
      containerEl
    });
  }

  componentWillUnmount() {
    this.state.externalWindow.close();
    EXTERNAL_POPUP_WINDOW = null;
  }

  cleanup = () => {
    // prevent the onbeforeunload from firing multiple times
    // if we close the window manually
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.props.cleanup();
  }

  render() {
    const { containerEl } = this.state;
    if (!containerEl) {
      return null;
    }
    return ReactDOM.createPortal(this.props.children, this.state.containerEl);
  }
}

class PointSelection extends React.Component {
  constructor(props) {
    super(props);
  }

  static propTypes = {
    selectStoryPoints: PropTypes.func.isRequired,
    selected: PropTypes.any,
  }

  render() {
    return (
      <Form>
        <FormGroup className={style['left-form-section']}>
          <Label for={SELECT_ID} className={style['white-label']}>Select Story Point Value</Label>
          <Input type="select" name={SELECT_ID} id={SELECT_ID} className={`${style['input']} ${style['select']}`}
            onChange={this.props.selectStoryPoints} value={this.props.selected}
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
    );
  }
}

class StoryPoints extends React.Component {
  constructor(props) {
    super(props);

    this.secret = new URLSearchParams(window.location.search).get('secret');

    this.state = {
      users: {},
      initialized: false,
      isQA: false,
      disconnected: false,
      selectPointsInPopup: false,
    };
  }

  componentDidMount() {
    socket.on('disconnect', () => {
      alert('Lost connection with the server. Please refresh the page to reconnect');
      this.setState({
        disconnected: true
      });
    });

    socket.on(events.STATE_UPDATE, (data) => {
      if (data.reset) {
        let elem = document.getElementById(SELECT_ID);
        if (elem == null && EXTERNAL_POPUP_WINDOW != null) {
          elem = EXTERNAL_POPUP_WINDOW.document.getElementById(SELECT_ID);
        }
        if (elem != null) {
          elem.value = NO_SELECTION;
        }
      }

      this.setState({
        ...data
      });
    });

    const name = window.localStorage.getItem(STORAGE_NAME_KEY);
    const sessionToken = window.localStorage.getItem(STORAGE_TOKEN_KEY);
    const room = window.localStorage.getItem(STORAGE_ROOM_NAME);
    const isQA = window.localStorage.getItem(STORAGE_IS_QA_KEY) === 'true';
    if (name && room) {
      socket.emit(events.ADD_USER, {
        ...this.createPayload(),
        name,
        room,
        token: sessionToken,
        isQA,
      }, (data) => {
        const stateUpdates = {
          initialized: true,
        };
        if (data.event === events.FAILED_JOIN) {
          alert(`Failed to automatically reconnect. Name "${name}" is already taken`);
        } else {
          stateUpdates.name = name;
          stateUpdates.room = room;
          stateUpdates.isQA = isQA;
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
      if (EXTERNAL_POPUP_WINDOW) {
        EXTERNAL_POPUP_WINDOW.close();
      }
    };
  }

  createPayload = () => {
    return {
      secret: this.secret,
      name: this.state.name,
      room: this.state.room,
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
        alert('You\'ve been disconnected. This page will now refresh.');
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
    const room = document.getElementById('room-name').value;
    if (!name) {
      return alert('Name cannot be empty');
    } else if (!room) {
      return alert('Room name cannot be empty');
    }
    const sessionToken = window.localStorage.getItem(STORAGE_TOKEN_KEY);
    socket.emit(events.ADD_USER, {
      ...this.createPayload(),
      name,
      room,
      token: sessionToken,
    }, (data) => {
      if (data.event === events.FAILED_JOIN) {
        alert('that name is already taken');
      } else {
        window.localStorage.setItem(STORAGE_NAME_KEY, name);
        window.localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        window.localStorage.setItem(STORAGE_ROOM_NAME, room);
        this.setState({
          name,
          room,
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
          <div className={style['form-group']}>
            <label className={style['form-label']}><b className={style['label']}>ROOM NAME</b></label>
            <input id="room-name" type="text" className={`form-control ${style['input']}`} placeholder="" 
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

  getStoryPointsView(mapping, userQAStatus) {
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
                  <li key={user}
                    className={userQAStatus[user] ? style['qa-user-name'] :''}>
                    {
                      userQAStatus[user] &&
                      <span className={style['qa-user-label']}>
                        QA:&nbsp;
                      </span>
                    }
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

  setQAStatus = () => {
    this.setState((prevState) => ({
      isQA: !prevState.isQA
    }), () => {
      window.localStorage.setItem(STORAGE_IS_QA_KEY, this.state.isQA);
      socket.emit(events.SET_QA_STATUS, {
        ...this.createPayload(),
        isQA: this.state.isQA
      });
    });
  }

  logout = () => {
    window.localStorage.removeItem(STORAGE_NAME_KEY);
    window.localStorage.removeItem(STORAGE_TOKEN_KEY);
    window.localStorage.removeItem(STORAGE_IS_QA_KEY);
    window.location.reload();
  }

  toggleSelectPointsInPopup = () => {
    if (this.state.selectPointsInPopup) {
      this.setState({
        selectPointsInPopup: false
      });
      if (EXTERNAL_POPUP_WINDOW != null) {
        EXTERNAL_POPUP_WINDOW.close();
      }
    } else {
      this.setState({
        selectPointsInPopup: true
      });
    }
  }

  closeSelectPopup = () => {
    this.setState({
      selectPointsInPopup: false
    });
  }

  getSelectedPointValue = () => {
    let value = this.state.users[this.state.name].value;

    if (value == null) {
      value = NO_SELECTION;
    }

    return value;
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
    const userQAStatus = {};
    STORY_POINT_VALUES.forEach(v => mapping[v] = []);
    Object.keys(this.state.users).forEach(u => {
      const value = this.state.users[u].value || NO_SELECTION;
      mapping[value].push(u);
      userQAStatus[u] = this.state.users[u].isQA;
    });

    return (
      <React.Fragment>
        {
          this.state.disconnected &&
          <div className={style['disconnected-message']}>
            Please refresh the page
          </div>
        }
        <div className={`${style['container']} ${this.state.disconnected ? style['disconnected-opacity'] : ''}`}>
          <div className={style['sidebar']}>
            <div>
              <div className={style['room-name-container']}>
                <span className={style['room-name-text']}>
                Room: <span className={style['room-name']}>{this.state.room}</span>
                </span>
              </div>
              {
                this.state.selectPointsInPopup ?
                  <StoryPointsPopup
                    cleanup={this.closeSelectPopup}
                    selectStoryPoints={this.selectStoryPoints}
                  >
                    <PointSelection
                      selectStoryPoints={this.selectStoryPoints}
                      selected={this.getSelectedPointValue()}
                    />
                    <button onClick={this.closeSelectPopup}>Close</button>
                  </StoryPointsPopup>
                  :
                  <PointSelection selectStoryPoints={this.selectStoryPoints} selected={this.getSelectedPointValue()}/>
              }
              <button className={`btn btn-danger ${style['button-red']} ${style['toggle-popup-button']}`} type="button" onClick={this.toggleSelectPointsInPopup}>
                Toggle Select Points in Popup
              </button>
              <Form>
                <FormGroup check>
                  <Label check className={style['inline-checkbox-label']}>
                    <Input type="checkbox"
                      checked={this.state.isQA}
                      onChange={this.setQAStatus}
                    />
                    Are you QA?
                  </Label>
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
            <div>
              <Timer socket={socket} createPayload={this.createPayload}/>
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
                this.getStoryPointsView(mapping, userQAStatus) :
                this.showUserStatus()
            }
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default StoryPoints;