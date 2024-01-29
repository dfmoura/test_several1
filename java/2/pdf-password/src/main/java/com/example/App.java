package com.example;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;

import java.io.File;
import java.io.IOException;

public class AddPasswordToPDF {
    public static void main(String[] args) {
        if (args.length != 3) {
            System.out.println("Usage: java AddPasswordToPDF input.pdf output.pdf password");
            return;
        }

        String inputPath = args[0];
        String outputPath = args[1];
        String password = args[2];

        try {
            PDDocument document = PDDocument.load(new File(inputPath));
            document.protect(null, password);
            document.save(outputPath);
            document.close();
            System.out.println("Password protected PDF saved to: " + outputPath);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
