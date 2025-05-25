import React from 'react';

class SelectForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '' };
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({ value: event.target.value }, () => {
      alert('Linguagem escolhida: ' + this.state.value);
    });
  }

  render() {
    return (
      <form>
        <label>
          Escolha sua linguagem favorita:
          <select value={this.state.value} onChange={this.handleChange}>
            <option value="">--Escolha uma--</option>
            <option value="java">Java</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
            <option value="python">Python</option>
          </select>
        </label>
      </form>
    );
  }
}

export default SelectForm;
