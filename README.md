
## API
* File managing

    * Side File 조회
            
        `GET` /side/{uuid}
        
    * Side File 변환
    
        `POST` /convert/side/js
        ```json
        {
          "file": "someFile"
        }
        ```
* Scheduling

    `POST` /jobs
    ```json
    {
      "processor": "jest",
      "when": "2018-06-25T19:20:00"
    }
    ```


