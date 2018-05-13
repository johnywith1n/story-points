import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import StoryPoints from 'components/StoryPoints';

class App extends React.Component {
  render() {
    return (
      <StoryPoints />
    );
  }
}

ReactDOM.render(<App />, document.getElementById('container'));

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  module.hot.accept();
}
