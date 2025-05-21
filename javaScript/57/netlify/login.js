// netlify/functions/login.js
exports.handler = async (event, context) => {
    const { username, password } = JSON.parse(event.body);
  
    const USERNAME = process.env.ADMIN_USER;
    const PASSWORD = process.env.ADMIN_PASS;
  
    if (username === USERNAME && password === PASSWORD) {
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Login autorizado" }),
      };
    }
  
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Credenciais inválidas" }),
    };
  };
  