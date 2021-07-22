import React, { useState , useEffect} from "react"
import "./forms.less"
import Comments from "./Comments"


const CommentsForm =  ( props )  => {
  let posted_to
  if (typeof window !== `undefined`) {
    posted_to = window.location.pathname.split('/')[3]
  }else{
    posted_to = " "
  }
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const approved = true
  const [commentSubmitted, setCommentSubmitted] = useState(false)
  const [showEph, setShowEph] = useState(false)
  const [errors, setErrors] = useState([])
  //let errors = []
/*
  useEffect(() => {
    setTimeout(() => {
    }, 3000);
    setCommentSubmitted(false)
  }, [commentSubmitted]);
*/
  const submit = e => {
    setErrors([])
    setCommentSubmitted(false)
    e.preventDefault()
    const date = Date.now()
    const post_date = new Intl.DateTimeFormat('en-US').format(date)
    const response_body = ({author, text, posted_to, post_date})
    fetch(`https://aminorstudio-api.herokuapp.com/comments/`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(response_body)
    }).then(res => res.json())
    .then(response => {
      if(response.errors) {
        let arr = []
        for (let i = 0; i < response.errors.length; i++){
          e = response.errors[i]
          const errorText =  `Error in ${e.param}: ${e.msg}`
          arr.push(errorText)
        }
        setErrors(arr)
      }else {
        setCommentSubmitted(true)
      }
    }).catch(error => {
      setErrors(["Something went wrong. Please try again in a moment."])
      console.log(error)
    })
  }

    return(
    <>
      <Comments />
      <form className="comment-form" onSubmit={submit} style={{
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h4>Leave a Comment</h4>
        {commentSubmitted && (
          <div> Thank you! I will approve your comment at some point.</div>
        )}
        {errors.length > 0 && (
          <ul>
          {errors.map((error) => (
            <li style={{listStyle: `none`, color: `red`, marginBottom: `0`}}>{error}</li>
          ))}
          </ul>
        )}
        <div style={{display: `flex`,
        flexDirection: `row`,
        padding: `1rem 0`}}>
        <label> Name</label>
        <input style={{width: `70%`}} value={author} onChange={e => setAuthor(e.target.value)} type="text" name="user_name"/>
        </div>
        <div style={{display: `flex`,
        flexDirection: `row`}}>
        <label>Comment</label>
        <textarea value={text} onChange={e => setText(e.target.value)} name="comment" style={{resize: `none`, width: `70%`, height: `150px`}}/>
        </div>

        <button type="submit">Submit</button>
      </form>
    </>
    )
}

export default CommentsForm