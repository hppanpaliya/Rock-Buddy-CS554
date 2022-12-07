const express = require("express");
const router = express.Router();
const helper = require('../helper');
const data = require('../data')
const {displayUpcomingEvents, searchEvents} = data.events;

router.route("/all")
    .get(async (request, response) =>{
        try {
            //1. validate 

            let page = request.query.page || 0;

            //2. query
            let data = await displayUpcomingEvents(page);

            //3. check if no results
            if(data.page.totalElements === 0){
                return response.status(404).json({error: `404: No more events found :(`})
            }

            response.status(200).json(data)
            return
    
            
        } catch (error) {
            response.status(400).json({error: error})
            return
        };

});

router.route("/search")
    .get(async (request, response) =>{
        try {
            let keyword = request.query.keyword || null;
            let page = request.query.page || 0;

            //1. validate 


            //2. query
            let data = await searchEvents(keyword, page);

            //3. check if no results
            if(data.page.totalElements === 0){
                return response.status(404).json({error: `No events found with search term ${keyword}`})
            };

            response.status(200).json(data)
            return
    
            
        } catch (error) {
            response.status(400).json({error: error})
            return
        };

});


module.exports = router;
