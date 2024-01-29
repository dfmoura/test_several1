<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <title>Chart Example</title>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX/jx.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
	  <style>
	    .popup {
	      display: none;
	      position: fixed;
	      top: 50%;
	      left: 50%;
	      transform: translate(-50%, -50%);
	      padding: 20px;
	      background-color: #fff;
	      border: 1px solid #ccc;
	      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
	    }

	    /* Style for the overlay/background */
	    .overlay {
	      display: none;
	      position: fixed;
	      top: 0;
	      left: 0;
	      width: 100%;
	      height: 100%;
	      background: rgba(0, 0, 0, 0.5);
	    }

	    /* Style for the form elements */
	    .form-input {
	      margin-bottom: 10px;
	    }
	</style>

</head>
<body>



  <button onclick="openPopup()">Open Popup</button>
  <div id="popup" class="popup">
    <h2>Popup Form</h2>
    <div class="form-input">
      <label for="date">Date:</label>
      <input type="text" id="date">
    </div>
    <div class="form-input">
      <label for="quantity">Quantity:</label>
      <input type="text" id="quantity">
    </div>
    <button onclick="insertData()">Insert</button>
    <button onclick="deleteData()">Delete</button>
    <button onclick="refreshData()">Refresh</button>
  </div>
  <div id="overlay" class="overlay" onclick="closePopup()"></div>

  <script>
    function openPopup() {
      document.getElementById("popup").style.display = "block";
      document.getElementById("overlay").style.display = "block";
    }

    function closePopup() {
      document.getElementById("popup").style.display = "none";
      document.getElementById("overlay").style.display = "none";
    }

    function insertData() {
      // Add your insert data logic here
      alert("Inserting data: Date - " + document.getElementById("date").value + ", Quantity - " + document.getElementById("quantity").value);
    }

    function deleteData() {
      // Add your delete data logic here
      alert("Deleting data");
    }

    function refreshData() {
      // Add your refresh data logic here
      alert("Refreshing data");
    }
  </script>



</body>
</html>
