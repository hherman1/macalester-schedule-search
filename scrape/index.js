const util = require('util');
var cheerio = require("cheerio");
var request = require("request");
console.log(process.argv);
const scrapeURL = process.argv[2];
const esURL = process.argv[3];
const esIndex = "main";
const esDocType = "course";
const esPutURL = esURL + "/" + esIndex + "/" + esDocType + "/";
request(process.argv[2],(error, response, body) => {
    var $ = cheerio.load(body);
    rows = $("tr.noborder:has(td>a.coursedetail)")
    objects = rows.map((i,e) => {
        var data = $("td",e).map((di,de) => cleanText($(de).text()));
        const out = {
            "code":data[0],
            "title":data[1],
            "days":data[2],
            "time":data[3],
            "loc":data[4],
            "prof":data[5],
            "space":data[6]
        };
        const href =  $("a.coursedetail",e).attr("href")
        out.crn = parseInt(href.substr(href.lastIndexOf("=") + 1));
        return out;
        })


//console.log(objects);
    objects.toArray().forEach((o) => {
        addRequirements(o);
    });

});
function cleanText(text) {
    return text.replace(/\s+/g," ");
}
function addRequirements(object) {
    const reqURL = "http://webapps.macalester.edu/utilities/scheduledetail/coursedetail.cfm?CRN=" + object.crn;
    const getReqs = (reqsP) => reqsP
        .text()
        .split(/[\n\r]/)
        .filter((e) => e.length != 0)
        .slice(1)
        .map(t => cleanText(t))

    request(reqURL,(error, response, body) => {
        var $ = cheerio.load(body);
        object.genEdReqs = getReqs($("p:contains('General Education Requirements:')"))

        object.distReqs = getReqs($("p:contains('Distribution Requirements:')"))

        uploadObject(object);
        console.log(util.inspect(object, false, null))
});
}
function uploadObject(object) {
    request({
        url:esPutURL + object.crn,
        method:'PUT',
        body:JSON.stringify(object)
    },(error,response,body) => {
        const result = JSON.parse(body);
        console.log(body);

        if(result.error != undefined) {
            console.log("rerunning")
            uploadObject(object)
        }
    })
}
