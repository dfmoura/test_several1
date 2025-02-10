/*cr's utilizados*/

        SELECT codcencus,DESCRCENCUS,'CR 23' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '23' or
        SUBSTR(codcencus, 1, 5) = '30003' or
        SUBSTR(codcencus, 1, 5) = '31003' or
        SUBSTR(codcencus, 1, 5) = '32003' or
        SUBSTR(codcencus, 1, 5) = '33004'
        
        UNION ALL

        SELECT codcencus,DESCRCENCUS ,'CR 24' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '24' or
        SUBSTR(codcencus, 1, 5) = '30002' or
        SUBSTR(codcencus, 1, 5) = '31002' or
        SUBSTR(codcencus, 1, 5) = '32002' or
        SUBSTR(codcencus, 1, 5) = '33005'

        UNION ALL

        SELECT codcencus,DESCRCENCUS ,'CR 25' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '25' or
        SUBSTR(codcencus, 1, 2) = '34'

        UNION ALL

        SELECT codcencus,DESCRCENCUS,'CR 26' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '26' or
        SUBSTR(codcencus, 1, 5) = '30001' or
        SUBSTR(codcencus, 1, 5) = '31001' or
        SUBSTR(codcencus, 1, 5) = '32001' or
        SUBSTR(codcencus, 1, 5) = '33001'

        UNION ALL   

        SELECT codcencus,DESCRCENCUS,'CR 27' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '27' or
        SUBSTR(codcencus, 1, 5) = '33003'

        UNION ALL

        SELECT codcencus,DESCRCENCUS,'CR 28' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '28' or
        SUBSTR(codcencus, 1, 5) = '33002'

        UNION ALL

        SELECT codcencus,DESCRCENCUS,'CR 29' CR
        FROM tsicus
        WHERE SUBSTR(codcencus, 1, 2) = '29'
        

ORDER BY 3,1