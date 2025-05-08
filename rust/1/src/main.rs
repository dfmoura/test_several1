fn main() {
    // Cria uma String a partir de um literal estático. A contrabarra '\' permite que a string continue na linha seguinte.
    let s: String = String::from("abcdefghijklmn\
    opqrstuvwxyz");

    // Cria uma fatia (&str) contendo os 5 primeiros caracteres da string 's'
    let s1: &str = &s[0..5]; // Isso equivale à fatia "abcde"
    println!("{}", s1);      // Imprime "abcde"

    // Cria uma fatia contendo os caracteres de índice 6 até e incluindo o 8 (inclusive)
    let s2: &str = &s[6..=8]; // Isso equivale à fatia "ghi"
    println!("{}", s2);       // Imprime "ghi"

    // Cria uma fatia da posição 20 até o final da string
    let s3: &str = &s[20..]; // Isso equivale à fatia "uvwxyz"
    println!("{}", s3);      // Imprime "uvwxyz"
}
