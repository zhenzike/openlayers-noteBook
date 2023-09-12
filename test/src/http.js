import axios from 'axios'

const service=axios.create({
    timeout:30000,
    withCredentials:true
})



axios.defaults.transformRequest=[(data)=>{
    let newData=''
    for(let k in data){
        newData+=encodeURIComponent(k)+'='+encodeURIComponent(data[k])+'&'
    }
    return  newData
}]


service.interceptors.request.use(
    config=>{
        return  config
    },
    err=>{
        return  Promise.reject(err)
    }
)
service.interceptors.response.use(
    response=>{
        return  response
    },
    err=>{
        return  Promise.reject(err)
    }
)


export default  service



