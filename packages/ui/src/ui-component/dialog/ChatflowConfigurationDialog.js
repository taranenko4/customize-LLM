import PropTypes from 'prop-types'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Box, Dialog, DialogContent, DialogTitle, Tabs, Tab } from '@mui/material'
import SpeechToText from './SpeechToTextDialog'
import Configuration from 'views/chatflows/Configuration'

const CHATFLOW_CONFIGURATION_TABS = [
    {
        label: 'Rate Limiting',
        id: 'rateLimiting'
    },
    {
        label: 'Speech to Text',
        id: 'speechToText'
    },
    {
        label: 'Chat Feedback',
        id: 'chatFeedback'
    },
    {
        label: 'Allowed Domains',
        id: 'allowedDomains'
    }
]

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`chatflow-config-tabpanel-${index}`}
            aria-labelledby={`chatflow-config-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

function a11yProps(index) {
    return {
        id: `chatflow-config-tab-${index}`,
        'aria-controls': `chatflow-config-tabpanel-${index}`
    }
}

const ChatflowConfigurationDialog = ({ show, dialogProps, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const [tabValue, setTabValue] = useState(0)

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth={'md'}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row' }}>{dialogProps.title}</div>
            </DialogTitle>
            <DialogContent>
                <Tabs
                    sx={{ position: 'relative', minHeight: '50px', height: '50px' }}
                    variant='fullWidth'
                    value={tabValue}
                    onChange={(event, value) => setTabValue(value)}
                    aria-label='tabs'
                >
                    {CHATFLOW_CONFIGURATION_TABS.map((item, index) => (
                        <Tab sx={{ minHeight: '50px', height: '50px' }} key={index} label={item.label} {...a11yProps(index)}></Tab>
                    ))}
                </Tabs>
                {CHATFLOW_CONFIGURATION_TABS.map((item, index) => (
                    <TabPanel key={index} value={tabValue} index={index}>
                        {item.id === 'rateLimiting' && <Configuration />}
                        {item.id === 'speechToText' ? <SpeechToText dialogProps={dialogProps} /> : null}
                    </TabPanel>
                ))}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ChatflowConfigurationDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func
}

export default ChatflowConfigurationDialog
