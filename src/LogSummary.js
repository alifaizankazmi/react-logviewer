import React from 'react';
import FontAwesome from 'react-fontawesome';

const severityToIcon = {
    Error: 'times-circle',
    Info: 'info-circle',
    Warning: 'exclamation-circle'
};

const severityToClass = {
    Error: 'text-danger',
    Info: 'text-info',
    Warning: 'text-warning'
}

function LogSummary(props) {
    return (
        <div>
            {
                Object.keys(props.counts).map((key, _) => {
                    return (<span className="mr-2" key={key}>
                        <FontAwesome name={severityToIcon[key]} size="lg" className={severityToClass[key]}/>
                        <span className="ml-1">{props.counts[key]}</span>
                    </span>);
                })
            }
        </div>
    );
}

export default LogSummary;