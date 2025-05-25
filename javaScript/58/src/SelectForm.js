import React from 'react';

class SelectForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '' };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    const selectedValue = event.target.value;
    this.setState({ value: selectedValue }, () => {
      alert('Você escolheu: ' + this.state.value);
    });
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  render() {
    return (
      <div className="container">
        <h2>Qual sua linguagem de programação favorita?</h2>
        <form onSubmit={this.handleSubmit}>
          <select value={this.state.value} onChange={this.handleChange}>
            <option value="">-- Selecione --</option>
            <option value="JavaScript">JavaScript</option>
            <option value="Python">Python</option>
            <option value="Java">Java</option>
            <option value="C#">C#</option>
            <option value="C++">C++</option>
          </select>
          <br />
          <button type="submit" style={{ marginTop: '10px' }}>Enviar</button>
        </form>
      </div>
    );
  }
}

export default SelectForm;
