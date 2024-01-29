import java.io.File;
import java.io.IOException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentProtection;

public class AddPasswordToPDF {
    public static void main(String[] args) {
        String inputFilePath = "input.pdf";  // Replace with your input PDF file
        String outputFilePath = "output.pdf";  // Replace with your output PDF file
        String ownerPassword = "owner123";
        String userPassword = "user123";

        try {
            PDDocument document = PDDocument.load(new File(inputFilePath));
            PDDocumentProtection pddp = new PDDocumentProtection();
            pddp.setOwnerPassword(ownerPassword);
            pddp.setUserPassword(userPassword);
            pddp.setEncryptionKeyLength(128);
            pddp.setPermissions(PDDocumentProtection.PERMISSIONS_PRINT);
            document.protect(pddp);
            document.save(outputFilePath);
            document.close();
            System.out.println("Password protection applied successfully!");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
