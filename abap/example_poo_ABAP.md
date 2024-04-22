# Example of poo to ABAP


```

CLASS animal DEFINITION.

  PUBLIC SECTION.

    DATA: cor_pele TYPE string.

    METHODS: comer.

ENDCLASS.

CLASS animal IMPLEMENTATION.

  METHOD comer.
    WRITE: 'Animal se alimentou!'.
  ENDMETHOD.

ENDCLASS.

CLASS ave DEFINITION INHERITING FROM animal.

  PUBLIC SECTION.

    METHODS: voar,
             comer REDEFINITION.

ENDCLASS.

CLASS ave IMPLEMENTATION.

    METHOD voar.
      WRITE: 'Ave voando!'.
    ENDMETHOD.

    METHOD comer.
      WRITE: 'Ave comendo!'.
    ENDMETHOD.

ENDCLASS.


DATA: cl_animal_1 TYPE REF TO animal,
      cl_animal_2 TYPE REF TO animal,
      cl_ave      TYPE REF TO ave.


INITIALIZATION.
  CREATE OBJECT cl_animal_1.
  CREATE OBJECT cl_animal_2.
  CREATE OBJECT cl_ave.

  cl_ave->cor_pele = 'Preta'.
  WRITE: cl_ave->cor_pele, /.
  cl_ave->voar( ).
  cl_ave->comer( ).

  cl_animal_1->cor_pele = 'Branca'.
  WRITE: cl_animal_1->cor_pele, /.

  cl_animal_2->cor_pele = 'Vermelha'.
  WRITE: cl_animal_2->cor_pele, /.

  cl_animal_1->comer( ).
```