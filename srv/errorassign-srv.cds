namespace errorassign.srv;
using { errorassign.db as dbmodel } from '../db/errorassign-model';

@path: '/assignerrors'
service ErrorAssignService {
    entity ErrorRecordSet as projection on dbmodel.ErrorAssignment;
}

