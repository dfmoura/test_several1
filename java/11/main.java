import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.ChartPanel;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.axis.CategoryAxis;
import org.jfree.chart.axis.NumberAxis;
import org.jfree.chart.plot.CategoryPlot;
import org.jfree.data.category.CategoryDataset;
import org.jfree.data.category.DefaultCategoryDataset;

import javax.swing.*;
import java.awt.*;
import java.io.IOException;

public class WebScrapingChart {

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> createAndShowGUI());
    }

    private static void createAndShowGUI() {
        JFrame frame = new JFrame("Web Scraping Chart");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        try {
            CategoryDataset dataset = createDataset();
            JFreeChart chart = createChart(dataset);
            ChartPanel chartPanel = new ChartPanel(chart);
            chartPanel.setPreferredSize(new Dimension(800, 600));
            frame.getContentPane().add(chartPanel, BorderLayout.CENTER);
        } catch (IOException e) {
            e.printStackTrace();
        }

        frame.pack();
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }

    private static CategoryDataset createDataset() throws IOException {
        String url = "https://abir.org.br/o-setor/dados/refrigerantes/";
        Document doc = Jsoup.connect(url).get();
        Element table = doc.select("table").get(0); // Assuming the desired table is the first one on the page
        Elements rows = table.select("tr");

        DefaultCategoryDataset dataset = new DefaultCategoryDataset();

        for (int i = 1; i < rows.size(); i++) {
            Element row = rows.get(i);
            Elements cols = row.select("td");
            String ano = cols.get(0).text();
            int volume = Integer.parseInt(cols.get(1).text().replaceAll("\\D+", ""));
            dataset.addValue(volume, "Volume", ano);
        }

        return dataset;
    }

    private static JFreeChart createChart(CategoryDataset dataset) {
        JFreeChart chart = ChartFactory.createBarChart(
                "Refrigerantes Volume Over Years",
                "Ano",
                "Volume",
                dataset
        );

        CategoryPlot plot = (CategoryPlot) chart.getPlot();
        CategoryAxis xAxis = plot.getDomainAxis();
        xAxis.setCategoryLabelPositions(CategoryLabelPositions.UP_45);

        NumberAxis yAxis = (NumberAxis) plot.getRangeAxis();
        yAxis.setStandardTickUnits(NumberAxis.createIntegerTickUnits());

        return chart;
    }
}
