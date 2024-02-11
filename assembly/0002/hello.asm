section .data
    hello db 'Hello, World!', 10 ; 10 is the ASCII code for newline

section .text
    global _start

_start:
    ; write the string to stdout
    mov eax, 4          ; sys_write system call
    mov ebx, 1          ; file descriptor 1 (stdout)
    mov ecx, hello      ; pointer to the string
    mov edx, 13         ; length of the string
    int 0x80            ; call kernel

    ; exit the program
    mov eax, 1          ; sys_exit system call
    xor ebx, ebx        ; return 0 status
    int 0x80            ; call kernel
