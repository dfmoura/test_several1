import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        String address = "rua josé paes de almeida,950 Uberlandia";
        double[] result = getLatLon(address);

        if (result != null) {
            System.out.printf("Latitude: %f, Longitude: %f%n", result[0], result[1]);
        } else {
            System.out.println("Local nao encontrado");
        }
    }

    private static double[] getLatLon(String address) {
        String base_url = "https://nominatim.openstreetmap.org/search";
        String charset = "UTF-8";

        try {
            String query = String.format("q=%s&format=json", URLEncoder.encode(address, charset));
            URL url = new URL(base_url + "?" + query);

            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");

            InputStream inputStream = connection.getInputStream();
            String response = new Scanner(inputStream, charset).useDelimiter("\\A").next();

            inputStream.close();
            connection.disconnect();

            // Parse JSON response
            if (!response.isEmpty()) {
                String[] latLonArray = response.split("\"lat\":\"|\",\"lon\":\"|\"}");
                double lat = Double.parseDouble(latLonArray[1]);
                double lon = Double.parseDouble(latLonArray[3]);

                return new double[]{lat, lon};
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        return null;
    }
}
