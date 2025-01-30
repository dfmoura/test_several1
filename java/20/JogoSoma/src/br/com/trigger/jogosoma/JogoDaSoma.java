package br.com.trigger.jogosoma;

import javax.swing.*;
import java.awt.*;
import java.awt.event.*;
import java.util.Random;

public class JogoDaSoma {
    private JFrame frame;
    private JPanel panel;
    private JLabel perguntaLabel;
    private JTextField respostaField;
    private JButton verificarButton;
    private JLabel resultadoLabel;
    private JLabel timerLabel;
    private int numero1, numero2;
    private int resultadoCorreto;
    private boolean emExecucao;
    private Timer timer;
    private int tempoRestante;

    public JogoDaSoma() {
        this.emExecucao = true;
        this.tempoRestante = 10;
        frame = new JFrame("Jogo da Soma");
        panel = new JPanel();
        panel.setLayout(new GridLayout(4, 1));

        perguntaLabel = new JLabel("Pergunta: ");
        resultadoLabel = new JLabel("");
        timerLabel = new JLabel("Tempo: 10");
        respostaField = new JTextField();
        verificarButton = new JButton("Verificar");

        panel.add(perguntaLabel);
        panel.add(respostaField);
        panel.add(verificarButton);
        panel.add(resultadoLabel);
        panel.add(timerLabel);

        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(400, 200);
        frame.add(panel);
        frame.setVisible(true);

        verificarButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                verificarResposta();
            }
        });

        timer = new Timer(1000, new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                tempoRestante--;
                timerLabel.setText("Tempo: " + tempoRestante);
                if (tempoRestante == 0) {
                    tempoAcabou();
                }
            }
        });
    }

    public void iniciar() {
        mostrarPergunta();
        timer.start();
    }

    private void mostrarPergunta() {
        Random random = new Random();
        numero1 = random.nextInt(100);
        numero2 = random.nextInt(100);
        resultadoCorreto = numero1 + numero2;

        perguntaLabel.setText("Quanto é " + numero1 + " + " + numero2 + "?");
        resultadoLabel.setText("");
        respostaField.setText("");
        tempoRestante = 10;
        timerLabel.setText("Tempo: 10");
    }

    private void verificarResposta() {
        try {
            int respostaUsuario = Integer.parseInt(respostaField.getText());
            if (respostaUsuario == resultadoCorreto) {
                resultadoLabel.setText("Correto! Próxima pergunta.");
                mostrarPergunta();
            } else {
                resultadoLabel.setText("Errado! O resultado correto era: " + resultadoCorreto);
                tempoAcabou();
            }
        } catch (NumberFormatException e) {
            resultadoLabel.setText("Resposta inválida! Você perdeu.");
            tempoAcabou();
        }
    }

    private void tempoAcabou() {
        timer.stop();
        JOptionPane.showMessageDialog(frame, "Fim de Jogo! Você demorou mais de 10 segundos ou cometeu um erro.");
        System.exit(0);
    }
}
