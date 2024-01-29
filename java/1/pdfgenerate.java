import com.itextpdf.text.Document;
import com.itextpdf.text.DocumentException;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;

import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.BufferedReader;

public class pdfgenerate {
    public static void main(String[] args) {
        try {
            Document document = new Document();
            PdfWriter.getInstance(document, new FileOutputStream("output.pdf"));
            document.open();

            BufferedReader br = new BufferedReader(new FileReader("test.txt"));
            String line;
            while ((line = br.readLine()) != null) {
                document.add(new Paragraph(line));
            }
            br.close();

            document.close();
            System.out.println("PDF generated successfully.");
        } catch (DocumentException | IOException e) {
            e.printStackTrace();
        }
    }
}
