import  service  from  '../http'

export  function getData(){
    let url='JSON/taifeng.json'
    return service({
        method:'GET',    
        url    
    })
}