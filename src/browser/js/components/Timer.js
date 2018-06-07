import React from 'react';
import PropTypes from 'prop-types';
import events from '../../../events';
import style from '../style/Timer.css';

class Timer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      startTime: 0,
      time: 0,
      showTimer: false,
      paused: false,
      initialized: false,
    };
  }

  static propTypes = {
    socket: PropTypes.object.isRequired,
    createPayload: PropTypes.func.isRequired,
  }

  componentDidMount() {
    this.props.socket.emit(events.GET_TIMER_STATE,
      this.props.createPayload(),
      (data) => {
        this.setState({
          ...data,
          initialized: true
        });
      }
    );

    this.props.socket.on(events.TIMER_UPDATE, (data) => {
      this.setState({
        ...data
      });
    });
  }

  startTimer = () => {
    this.props.socket.emit(events.START_TIMER, {
      ...this.props.createPayload(),
      time: this.state.startTime
    });
  }

  continueTimer = () => {
    this.props.socket.emit(events.CONTINUE_TIMER, this.props.createPayload());
  }

  resetTime = () => {
    this.props.socket.emit(events.RESET_TIMER, this.props.createPayload());
  }

  pauseTimer = () => {
    this.props.socket.emit(events.PAUSE_TIMER, this.props.createPayload());
  }

  hardReset = () => {
    this.props.socket.emit(events.HARD_RESET_TIMER, this.props.createPayload());
  }

  updateTime = (e) => {
    const time = parseInt(e.target.value || 0);
    if (!Number.isInteger(time)) {
      return;
    }
    this.setState({
      startTime: time
    });
  }

  render() {
    if (!this.state.initialized) {
      return null;
    }

    return (
      <div className={style['container']}>
        {
          !this.state.showTimer &&
          <React.Fragment>
            <label>Timer (seconds)</label>
            <div className="input-group">
              <input type="text" className="form-control"
                value={this.state.startTime}
                onChange={this.updateTime}/>
            </div>
            <div className="btn-group" role="group">
              <button type="button" className="btn btn-primary" onClick={this.startTimer}>Start</button>
              <button type="button" className="btn btn-danger" onClick={this.hardReset}>Hard Reset</button>
            </div>
          </React.Fragment>
        }
        {
          this.state.showTimer &&
          <React.Fragment>
            <div className={style['time-remaining-label']}>
              Time Left:
            </div>
            <div className={style['time-remaining']}>
              {this.state.time}
            </div>
            <div className={`btn-group ${style['timer-controls']}`} role="group">
              <button type="button" className="btn btn-danger" onClick={this.resetTime}>
                Reset
              </button>
              {
                !this.state.paused &&
                <button type="button" className="btn btn-danger" onClick={this.pauseTimer}>
                  Pause
                </button>
              }
              {
                this.state.paused &&
                <button type="button" className="btn btn-danger" onClick={this.continueTimer}>
                  Continue
                </button>
              }
            </div>
          </React.Fragment>
        }
      </div>
    );
  }
}

export default Timer;
