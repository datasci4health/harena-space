'use strict'

const Env = use("Env")
const axios = use("axios")


class CaseController {
    async fetch ({ view }) {

        const harena_manager_url = Env.get("HARENA_MANAGER_URL", "http://127.0.0.1:1020");
        const cases_url = harena_manager_url + "/cases"        
        const cases = axios.get(cases_url)
                      .then((reponse) => {
                          console.log(reponse)
                      }, (error) => {
                          console.log(error)
                      })
    }

    async store ({request, session, response}) {
        try {
            const params = request.all()

            const endpoint_url = Env.get("HARENA_MANAGER_URL") + "/api/v1/case"

            const template_source = 
            `
            # Presentation (quiz)

            Write here the **stem** of your quiz.
            
            > Write here the **lead-in** of your quiz.
            + Distractor 1 <-> "Feedback for Distractor 1"
            + Distractor 1 <-> "Feedback for Distractor 1"
            + Distractor 2 <-> "Feedback for Distractor 2"
            + Distractor 3 <-> "Feedback for Distractor 3"
            
            * Next Case -> Case.Next
            * Menu -> Presentation
            
            # Feedback Note (note)
            
            You answered: ^Presentation.hypothesis^.
            
            ^parameter^
            
            * Return -> Presentation
            
            ___ Flow ___
            
            * Sequential:
              * _sequential_
            
            ___ Data ___
            
            * theme: simple
            * namespaces:
              * evidence: http://purl.org/versum/evidence/
            * templates:
              * categories:
                * detailed: simple/knot/description
            `
            // console.log(request.cookie('token'))
            // let token = request.cookie('token')
            const config = {
                method: "post",
                url: endpoint_url,
                data: {
                    title: params.case_title,
                    description: params.description,
                    language: params.language,
                    domain: params.domain,
                    specialty: params.specialty,
                    keywords: params.keywords,
                    source: template_source,
                },
                    headers: {
                        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJjOWIxMmFjNi0yOThhLTQ2NTAtYWM2Zi0zODJlMzBjMWIyYTMiLCJpYXQiOjE1OTY3NjA2MDgsImV4cCI6MTU5Njg0NzAwOH0.npYm7yQTeYsiPjnokF-vRgbiKLNCQJmNHocEB_bID1A`  
                    }
            }

            await axios(config)
            .then(function (endpoint_response) {
                // return response.redirect('/author/author.html')
                          return response.redirect('/')

                })
            .catch(function (error) {
                console.log(error);
            });

        }
        catch (e) {
            console.log(e)
        }
    }
}

module.exports = CaseController