package main

import (
	"fmt"
)

func main() {
	rows := 3
	cols := 3
	matrix := make([][]int, rows)

	for i := range matrix {
		matrix[i] = make([]int, cols)
	}

	// enchimento com valores
	value := 1
	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			matrix[i][j] = value
			value++
		}
	}

	// impressao de matrix
	for i := 0; i < rows; i++ {
		for j := 0; j < cols; j++ {
			fmt.Printf("%d ", matrix[i][j])
		}
		fmt.Println()
	}
}
 